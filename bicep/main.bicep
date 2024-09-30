metadata description = 'Deploy to Azure'

@description('Family name of the deployment.')
param deploymentFamilyName string

@description('Token service image name and tag.')
param tokenAppImageName string

@description('Username to authenticate with private registry.')
@secure()
param registryUsername string

@description('Registry server name')
param registryServer string

@description('Password to authenticate with private registry.')
@secure()
param registryPassword string

@description('Name of the User-assigned Managed Identity to run this Bicep.')
param builderIdentityName string

param deployTime string = utcNow()
// TODO: Temporarily setting KV to "westus".
param location string = 'westus'
// param location string = resourceGroup().location

param keyVaultName string = '${deploymentFamilyName}-key'
param logAnalyticsName string = '${deploymentFamilyName}-log'
param echoBotDeploymentFamilyName string = '${deploymentFamilyName}-echo-bot'
param mockBotDeploymentFamilyName string = '${deploymentFamilyName}-mock-bot'
// param mockBotAppName string = '${deploymentFamilyName}-mock-bot-app'
// param mockBotName string = '${deploymentFamilyName}-mock-bot'
param speechServicesName string = '${deploymentFamilyName}-speech'
param tokenAppName string = '${deploymentFamilyName}-token-app'

resource builderIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-07-31-preview' existing = {
  name: builderIdentityName
}

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2021-12-01-preview' = {
  location: location
  name: logAnalyticsName
  properties: {
    sku: {
      name: 'PerGB2018'
    }
  }
}

resource tokenAppIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-07-31-preview' = {
  location: location
  name: '${tokenAppName}-identity'
}

resource speechServices 'Microsoft.CognitiveServices/accounts@2024-04-01-preview' = {
  kind: 'SpeechServices'
  location: location
  name: speechServicesName
  properties: {
    // https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-services-private-link?tabs=portal#adjust-an-application-to-use-a-speech-resource-without-private-endpoints
    customSubDomainName: speechServicesName
    disableLocalAuth: true
  }
  sku: {
    name: 'S0'
  }
  // TODO: Should add role assignment for "tokenAppIdentity" or a new "speechUser" identity.
}

resource speechServicesIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-07-31-preview' = {
  location: location
  name: '${speechServicesName}-identity'
}

// ERROR: Cannot set role assignment because
//        {
//          "code": "InvalidTemplateDeployment",
//          "message": "The template deployment failed with error: 'Authorization failed for template resource 'xxx-token-app-identity-speech-role' of type 'Microsoft.Authorization/roleAssignments'. The client 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxx' with object id 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxx' does not have permission to perform action 'Microsoft.Authorization/roleAssignments/write' at scope '/subscriptions/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxx/resourceGroups/xxx-rg/providers/Microsoft.CognitiveServices/accounts/xxx-speech/providers/Microsoft.Authorization/roleAssignments/xxx-token-app-identity-speech-role'.'."
//        }

@description('This is the built-in Cognitive Services Speech User role. See https://docs.microsoft.com/azure/role-based-access-control/built-in-roles#contributor')
resource speechServicesUserRoleDefinition 'Microsoft.Authorization/roleDefinitions@2022-04-01' existing = {
  scope: subscription()
  name: 'f2dc8367-1007-4938-bd23-fe263f013447'
}

resource roleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  // Use GUID to prevent error on creating role assignment after deletion.
  // https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/scenarios-rbac#resource-deletion-behavior
  name: guid(resourceGroup().id, speechServicesIdentity.id, speechServicesUserRoleDefinition.id)
  properties: {
    roleDefinitionId: speechServicesUserRoleDefinition.id
    principalId: speechServicesIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
  scope: speechServices
}

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  location: location
  name: keyVaultName
  properties: {
    accessPolicies: [
      {
        objectId: tokenAppIdentity.properties.principalId
        permissions: {
          secrets: ['get']
        }
        tenantId: tenant().tenantId
      }
      {
        objectId: builderIdentity.properties.principalId
        permissions: {
          secrets: ['set']
        }
        tenantId: tenant().tenantId
      }
    ]
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: tenant().tenantId
  }
}

resource echoBotDirectLineSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  name: '${echoBotDeploymentFamilyName}-direct-line-secret'
  parent: keyVault
  properties: {
    value: 'PLACEHOLDER' // Creates an empty slot and we will fill it out later.
  }
}

resource mockBotDirectLineSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  name: '${mockBotDeploymentFamilyName}-direct-line-secret'
  parent: keyVault
  properties: {
    value: 'PLACEHOLDER' // Creates an empty slot and we will fill it out later.
  }
}

resource speechServicesSubscriptionKey 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  name: 'speech-services-subscription-key'
  parent: keyVault
  properties: {
    value: speechServices.listKeys().key1
  }
}

resource echoBotIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-07-31-preview' = {
  location: location
  name: '${echoBotDeploymentFamilyName}-identity'
}

module echoBotWithApp 'botWithApp.bicep' = {
  name: echoBotDeploymentFamilyName
  params: {
    botIdentityId: echoBotIdentity.id
    botIdentityClientId: echoBotIdentity.properties.clientId
    botIdentityTenantId: echoBotIdentity.properties.tenantId
    builderIdentityId: builderIdentity.id
    deploymentFamilyName: echoBotDeploymentFamilyName
    deployTime: deployTime
    location: location
  }
}

resource echoBotKeyVaultSaveSecretScript 'Microsoft.Resources/deploymentScripts@2023-08-01' = {
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${builderIdentity.id}': {}
    }
  }
  kind: 'AzureCLI'
  location: location
  #disable-next-line use-stable-resource-identifiers
  name: '${echoBotWithApp.name}-save-secret-script'
  properties: {
    arguments: '\\"${echoBotWithApp.outputs.botName}\\" \\"${echoBotDirectLineSecret.name}\\" \\"${keyVault.name}\\" \\"${resourceGroup().name}\\"'
    azCliVersion: '2.61.0'
    cleanupPreference: 'Always'
    forceUpdateTag: deployTime
    retentionInterval: 'PT1H' // Minimal retention is 1 hour.
    scriptContent: '''
      set -eo pipefail

      BOT_NAME=$1
      DIRECT_LINE_SECRET_SECRET_NAME=$2
      KEY_VAULT_NAME=$3
      RESOURCE_GROUP_NAME=$4

      # Direct Line secret can only be retrieved via HTTP POST call, thus, "update" command is required.
      DIRECT_LINE_SECRET=$(az bot directline update --name $BOT_NAME --output json --resource-group $RESOURCE_GROUP_NAME | jq -r ".properties.properties.sites[0].key")

      az keyvault secret set \
        --name $DIRECT_LINE_SECRET_SECRET_NAME \
        --output none \
        --value $DIRECT_LINE_SECRET \
        --vault-name $KEY_VAULT_NAME
    '''
    timeout: 'PT2M'
  }
}

resource mockBotIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-07-31-preview' = {
  location: location
  name: '${mockBotDeploymentFamilyName}-identity'
}

module mockBotWithApp 'botWithApp.bicep' = {
  name: mockBotDeploymentFamilyName
  params: {
    botIdentityClientId: mockBotIdentity.properties.clientId
    botIdentityId: mockBotIdentity.id
    botIdentityTenantId: mockBotIdentity.properties.tenantId
    builderIdentityId: builderIdentity.id
    deploymentFamilyName: mockBotDeploymentFamilyName
    deployTime: deployTime
    location: location
  }
}

resource mockBotKeyVaultSaveSecretScript 'Microsoft.Resources/deploymentScripts@2023-08-01' = {
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${builderIdentity.id}': {}
    }
  }
  kind: 'AzureCLI'
  location: location
  #disable-next-line use-stable-resource-identifiers
  name: '${mockBotDeploymentFamilyName}-save-secret-script'
  properties: {
    arguments: '\\"${mockBotWithApp.outputs.botName}\\" \\"${mockBotDirectLineSecret.name}\\" \\"${keyVault.name}\\" \\"${resourceGroup().name}\\"'
    azCliVersion: '2.61.0'
    cleanupPreference: 'Always'
    forceUpdateTag: deployTime
    retentionInterval: 'PT1H' // Minimal retention is 1 hour.
    scriptContent: '''
      set -eo pipefail

      BOT_NAME=$1
      DIRECT_LINE_SECRET_SECRET_NAME=$2
      KEY_VAULT_NAME=$3
      RESOURCE_GROUP_NAME=$4

      # Direct Line secret can only be retrieved via HTTP POST call, thus, "update" command is required.
      DIRECT_LINE_SECRET=$(az bot directline update --name $BOT_NAME --output json --resource-group $RESOURCE_GROUP_NAME | jq -r ".properties.properties.sites[0].key")

      az keyvault secret set \
        --name $DIRECT_LINE_SECRET_SECRET_NAME \
        --output none \
        --value $DIRECT_LINE_SECRET \
        --vault-name $KEY_VAULT_NAME
    '''
    timeout: 'PT2M'
  }
}

// https://learn.microsoft.com/en-us/azure/templates/microsoft.app/managedenvironments?pivots=deployment-language-bicep
resource tokenAppEnvironment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  location: location
  name: '${tokenAppName}-env'
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

resource tokenApp 'Microsoft.App/containerApps@2024-03-01' = {
  dependsOn: [
    // This Bicep doesn't implicitly talks about botApp depends on keyVaultSaveSecretScript.
    // When the Container Apps is up, it may retrieve the placeholder value instead of the actual because of the deployment order.
    echoBotKeyVaultSaveSecretScript
  ]
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${echoBotIdentity.id}': {}
      '${mockBotIdentity.id}': {}
      '${speechServicesIdentity.id}': {}
      '${tokenAppIdentity.id}': {}
      // TODO: Add speech identity
    }
  }
  location: location
  name: tokenAppName
  properties: {
    configuration: {
      ingress: {
        clientCertificateMode: 'ignore'
        external: true
        targetPort: 8080
        transport: 'http'
        // corsPolicy: {
        //   allowedOrigins: [
        //   ]
        // }
      }
      registries: [
        {
          passwordSecretRef: 'registry-password'
          server: registryServer
          username: registryUsername
        }
      ]
      secrets: [
        {
          identity: tokenAppIdentity.id
          keyVaultUrl: echoBotDirectLineSecret.properties.secretUri
          name: '${echoBotDeploymentFamilyName}-direct-line-secret'
        }
        {
          identity: tokenAppIdentity.id
          keyVaultUrl: mockBotDirectLineSecret.properties.secretUri
          name: '${mockBotDeploymentFamilyName}-direct-line-secret'
        }
        {
          name: 'registry-password'
          value: registryPassword
        }
        {
          identity: tokenAppIdentity.id
          keyVaultUrl: speechServicesSubscriptionKey.properties.secretUri
          name: 'speech-services-subscription-key'
        }
      ]
    }
    managedEnvironmentId: tokenAppEnvironment.id
    template: {
      containers: [
        {
          env: [
            // {
            //   name: 'AZURE_LOG_LEVEL'
            //   value: 'verbose'
            // }
            {
              name: 'ECHO_BOT_APP_HOST_NAME'
              value: echoBotWithApp.outputs.appDefaultHostName
            }
            {
              name: 'ECHO_BOT_AZURE_CLIENT_ID'
              value: echoBotIdentity.properties.clientId
            }
            {
              name: 'ECHO_BOT_DIRECT_LINE_SECRET'
              secretRef: '${echoBotDeploymentFamilyName}-direct-line-secret'
            }
            {
              name: 'MOCK_BOT_APP_HOST_NAME'
              value: mockBotWithApp.outputs.appDefaultHostName
            }
            {
              name: 'MOCK_BOT_AZURE_CLIENT_ID'
              value: mockBotIdentity.properties.clientId
            }
            {
              name: 'MOCK_BOT_DIRECT_LINE_SECRET'
              secretRef: '${mockBotDeploymentFamilyName}-direct-line-secret'
            }
            {
              name: 'SPEECH_SERVICES_AZURE_CLIENT_ID'
              value: speechServicesIdentity.properties.clientId
            }
            {
              name: 'SPEECH_SERVICES_REGION'
              value: location
            }
            {
              name: 'SPEECH_SERVICES_RESOURCE_ID'
              value: speechServices.id
            }
            {
              name: 'SPEECH_SERVICES_SUBSCRIPTION_KEY'
              secretRef: 'speech-services-subscription-key'
            }
            {
              name: 'TRUSTED_ORIGINS'
              value: ''
              // value: 'https://compulim.github.io,https://localhost'
            }
          ]
          image: '${registryServer}/${tokenAppImageName}'
          name: tokenAppName
          probes: [
            {
              httpGet: {
                path: '/health.txt'
                port: 8080
              }
              type: 'Liveness'
            }
          ]
          resources: {
            #disable-next-line BCP036
            cpu: '0.25'
            memory: '0.5Gi'
          }
        }
      ]
      scale: {
        maxReplicas: 1
        minReplicas: 1 // Should idle
      }
    }
  }
}

// Output "echoBotAppName" for ZIP deployment later.
output echoBotAppName string = echoBotWithApp.outputs.appName

// Output "echoBotAppURL" for display in GitHub deployment.
output echoBotAppURL string = echoBotWithApp.outputs.appURL

// Output "mockBotAppName" for ZIP deployment later.
output mockBotAppName string = mockBotWithApp.outputs.appName

// Output "mockBotAppURL" for display in GitHub deployment.
output mockBotAppURL string = mockBotWithApp.outputs.appURL

// Output "tokenAppURL" for GitHub Pages.
output tokenAppURL string = 'https://${tokenApp.properties.configuration.ingress.fqdn}/'
