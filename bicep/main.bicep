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
param echoBotAppName string = '${deploymentFamilyName}-echo-bot-app'
param echoBotName string = '${deploymentFamilyName}-echo-bot'
param mockBotAppName string = '${deploymentFamilyName}-mock-bot-app'
param mockBotName string = '${deploymentFamilyName}-mock-bot'
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
    disableLocalAuth: true
  }
  sku: {
    name: 'S0'
  }
  // TODO: Should add role assignment for "tokenAppIdentity" or a new "speechUser" identity.
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
  name: '${echoBotName}-direct-line-secret'
  parent: keyVault
  properties: {
    value: 'PLACEHOLDER' // Creates an empty slot and we will fill it out later.
  }
}

resource mockBotDirectLineSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  name: '${mockBotName}-direct-line-secret'
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
  name: '${echoBotName}-identity'
}

resource echoBot 'Microsoft.BotService/botServices@2023-09-15-preview' = {
  kind: 'azurebot'
  location: 'global'
  name: echoBotName
  properties: {
    displayName: echoBotName
    endpoint: 'https://dummy.localhost/api/messages' // Chicken-and-egg problem, we will set it later.
    msaAppId: echoBotIdentity.properties.clientId
    msaAppMSIResourceId: echoBotIdentity.id
    msaAppTenantId: echoBotIdentity.properties.tenantId
    msaAppType: 'UserAssignedMSI'
  }
  sku: {
    name: 'S1'
  }
}

resource echoBotDummyOAuthConnection 'Microsoft.BotService/botServices/connections@2023-09-15-preview' = {
  location: 'global' // Required. If not set, will error out with "The value for property 'location' in the input object cannot be empty."
  name: '${echoBotName}-dummy-oauth-connection'
  parent: echoBot
  properties: {
    clientId: 'dummy'
    clientSecret: 'dummy'
    id: 'dummy'
    name: 'Dummy'
    serviceProviderId: 'd05eaacf-1593-4603-9c6c-d4d8fffa46cb' // "GitHub"
  }
}

resource echoBotDirectLineChannel 'Microsoft.BotService/botServices/channels@2023-09-15-preview' = {
  name: '${echoBotName}-direct-line-channel'
  parent: echoBot
  properties: {
    channelName: 'DirectLineChannel'
    properties: {
      sites: [
        {
          isEnabled: true
          isSecureSiteEnabled: true
          isV1Enabled: false
          isV3Enabled: true
          siteName: 'Default Site'
          trustedOrigins: [
            'https://compulim.github.io'
          ]
        }
      ]
    }
  }
}

// Direct Line Speech is not working with `disableLocalAuth`, need investigations.
// resource echoBotDirectLineSpeechChannel 'Microsoft.BotService/botServices/channels@2023-09-15-preview' = {
//   location: 'global' // Required. If not set, will error out with "The value for property 'location' in the input object cannot be empty."
//   name: '${echoBotName}-direct-line-speech-channel'
//   parent: echoBot
//   properties: {
//     channelName: 'DirectLineSpeechChannel'
//     properties: {
//       cognitiveServiceRegion: speechServices.location
//       cognitiveServiceResourceId: speechServices.id
//       cognitiveServiceSubscriptionKey: speechServices.listKeys().key1
//       // customSpeechModelId: ''
//       // customVoiceDeploymentId: ''
//       isEnabled: true
//     }
//   }
// }

// Disable Direct Line Speech for now.
resource echoBotDirectLineSpeechChannel 'Microsoft.BotService/botServices/channels@2023-09-15-preview' = {
  location: 'global' // Required. If not set, will error out with "The value for property 'location' in the input object cannot be empty."
  name: '${echoBotName}-direct-line-speech-channel'
  parent: echoBot
  properties: {
    channelName: 'DirectLineSpeechChannel'
    properties: {
      isEnabled: false
    }
  }
}

resource echoBotWebChatChannel 'Microsoft.BotService/botServices/channels@2023-09-15-preview' = {
  name: '${echoBotName}-web-chat-channel'
  parent: echoBot
  properties: {
    channelName: 'WebChatChannel'
    properties: {
      sites: [] // Remove all sites
    }
  }
}

resource echoBotAppIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-07-31-preview' = {
  location: location
  name: '${echoBotAppName}-identity'
}

resource echoBotAppPlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  location: location
  name: '${echoBotAppName}-plan'
  properties: {
    zoneRedundant: false
  }
  sku: {
    family: 'S'
    name: 'S1'
    size: 'S1'
    tier: 'Standard'
  }
}

resource echoBotApp 'Microsoft.Web/sites@2023-12-01' = {
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${echoBotAppIdentity.id}': {}
      '${echoBotIdentity.id}': {}
    }
  }
  location: location
  name: echoBotAppName
  properties: {
    clientAffinityEnabled: false
    httpsOnly: true
    serverFarmId: echoBotAppPlan.id
    siteConfig: {
      alwaysOn: true
      appSettings: [
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~20'
        }
        {
          name: 'DIRECTLINE_EXTENSION_VERSION'
          value: 'latest'
        }
        {
          name: 'DirectLineExtensionKey'
          value: echoBotDirectLineChannel.properties.properties.extensionKey1
        }
        {
          name: 'MicrosoftAppId'
          value: echoBotIdentity.properties.clientId
        }
        {
          name: 'MicrosoftAppTenantId'
          value: echoBotIdentity.properties.tenantId
        }
        {
          name: 'MicrosoftAppType'
          value: 'UserAssignedMSI'
        }
        {
          name: 'OAUTH_CONNECTION_NAME'
          value: echoBotDummyOAuthConnection.name
        }
        {
          name: 'WEBSITE_RUN_FROM_PACKAGE'
          value: '1'
        }
      ]
      ftpsState: 'Disabled'
      metadata: [
        {
          name: 'CURRENT_STACK'
          value: 'node'
        }
      ]
      webSocketsEnabled: true
    }
  }
}

resource echoBotReconfigureScript 'Microsoft.Resources/deploymentScripts@2023-08-01' = {
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${builderIdentity.id}': {}
    }
  }
  kind: 'AzureCLI'
  location: location
  #disable-next-line use-stable-resource-identifiers
  name: '${echoBot.name}-script'
  properties: {
    arguments: '\\"${echoBotApp.properties.defaultHostName}\\" \\"${echoBot.name}\\" \\"${resourceGroup().name}\\"'
    azCliVersion: '2.61.0'
    cleanupPreference: 'Always'
    forceUpdateTag: deployTime
    retentionInterval: 'PT1H' // Minimal retention is 1 hour.
    scriptContent: '''
      set -eo pipefail

      BOT_APP_NAME=$1
      BOT_NAME=$2
      RESOURCE_GROUP_NAME=$3

      az bot update \
        --name $BOT_NAME \
        --resource-group $RESOURCE_GROUP_NAME \
        --endpoint https://$BOT_APP_NAME/api/messages
    '''
    timeout: 'PT2M'
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
  name: '${echoBotName}-save-secret-script'
  properties: {
    arguments: '\\"${echoBot.name}\\" \\"${echoBotDirectLineSecret.name}\\" \\"${keyVault.name}\\" \\"${resourceGroup().name}\\"'
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
  name: '${mockBotName}-identity'
}

resource mockBot 'Microsoft.BotService/botServices@2023-09-15-preview' = {
  kind: 'azurebot'
  location: 'global'
  name: mockBotName
  properties: {
    displayName: mockBotName
    endpoint: 'https://dummy.localhost/api/messages' // Chicken-and-egg problem, we will set it later.
    msaAppId: mockBotIdentity.properties.clientId
    msaAppMSIResourceId: mockBotIdentity.id
    msaAppTenantId: mockBotIdentity.properties.tenantId
    msaAppType: 'UserAssignedMSI'
  }
  sku: {
    name: 'S1'
  }
}

resource mockBotDummyOAuthConnection 'Microsoft.BotService/botServices/connections@2023-09-15-preview' = {
  location: 'global' // Required. If not set, will error out with "The value for property 'location' in the input object cannot be empty."
  name: '${mockBotName}-dummy-oauth-connection'
  parent: mockBot
  properties: {
    clientId: 'dummy'
    clientSecret: 'dummy'
    id: 'dummy'
    name: 'Dummy'
    serviceProviderId: 'd05eaacf-1593-4603-9c6c-d4d8fffa46cb' // "GitHub"
  }
}

resource mockBotDirectLineChannel 'Microsoft.BotService/botServices/channels@2023-09-15-preview' = {
  name: '${mockBotName}-direct-line-channel'
  parent: mockBot
  properties: {
    channelName: 'DirectLineChannel'
    properties: {
      sites: [
        {
          isEnabled: true
          isSecureSiteEnabled: true
          isV1Enabled: false
          isV3Enabled: true
          siteName: 'Default Site'
          trustedOrigins: [
            'https://compulim.github.io'
          ]
        }
      ]
    }
  }
}

// Direct Line Speech is not working with `disableLocalAuth`, need investigations.
// resource mockBotDirectLineSpeechChannel 'Microsoft.BotService/botServices/channels@2023-09-15-preview' = {
//   location: 'global' // Required. If not set, will error out with "The value for property 'location' in the input object cannot be empty."
//   name: '${mockBotName}-direct-line-speech-channel'
//   parent: mockBot
//   properties: {
//     channelName: 'DirectLineSpeechChannel'
//     properties: {
//       cognitiveServiceRegion: speechServices.location
//       cognitiveServiceResourceId: speechServices.id
//       cognitiveServiceSubscriptionKey: speechServices.listKeys().key1
//       // customSpeechModelId: ''
//       // customVoiceDeploymentId: ''
//       isEnabled: true
//     }
//   }
// }

// Disable Direct Line Speech for now.
resource mockBotDirectLineSpeechChannel 'Microsoft.BotService/botServices/channels@2023-09-15-preview' = {
  location: 'global' // Required. If not set, will error out with "The value for property 'location' in the input object cannot be empty."
  name: '${mockBotName}-direct-line-speech-channel'
  parent: mockBot
  properties: {
    channelName: 'DirectLineSpeechChannel'
    properties: {
      isEnabled: false
    }
  }
}

resource mockBotWebChatChannel 'Microsoft.BotService/botServices/channels@2023-09-15-preview' = {
  name: '${mockBotName}-web-chat-channel'
  parent: mockBot
  properties: {
    channelName: 'WebChatChannel'
    properties: {
      sites: [] // Remove all sites
    }
  }
}

resource mockBotAppIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-07-31-preview' = {
  location: location
  name: '${mockBotAppName}-identity'
}

resource mockBotAppPlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  location: location
  name: '${mockBotAppName}-plan'
  properties: {
    zoneRedundant: false
  }
  sku: {
    family: 'S'
    name: 'S1'
    size: 'S1'
    tier: 'Standard'
  }
}

resource mockBotApp 'Microsoft.Web/sites@2023-12-01' = {
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${mockBotAppIdentity.id}': {}
      '${mockBotIdentity.id}': {}
    }
  }
  location: location
  name: mockBotAppName
  properties: {
    clientAffinityEnabled: false
    httpsOnly: true
    serverFarmId: mockBotAppPlan.id
    siteConfig: {
      alwaysOn: true
      appSettings: [
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~20'
        }
        {
          name: 'DIRECTLINE_EXTENSION_VERSION'
          value: 'latest'
        }
        {
          name: 'DirectLineExtensionKey'
          value: mockBotDirectLineChannel.properties.properties.extensionKey1
        }
        {
          name: 'MicrosoftAppId'
          value: mockBotIdentity.properties.clientId
        }
        {
          name: 'MicrosoftAppTenantId'
          value: mockBotIdentity.properties.tenantId
        }
        {
          name: 'MicrosoftAppType'
          value: 'UserAssignedMSI'
        }
        {
          name: 'OAUTH_CONNECTION_NAME'
          value: mockBotDummyOAuthConnection.name
        }
        {
          name: 'WEBSITE_RUN_FROM_PACKAGE'
          value: '1'
        }
      ]
      ftpsState: 'Disabled'
      metadata: [
        {
          name: 'CURRENT_STACK'
          value: 'node'
        }
      ]
      webSocketsEnabled: true
    }
  }
}

resource mockBotReconfigureScript 'Microsoft.Resources/deploymentScripts@2023-08-01' = {
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${builderIdentity.id}': {}
    }
  }
  kind: 'AzureCLI'
  location: location
  #disable-next-line use-stable-resource-identifiers
  name: '${mockBot.name}-script'
  properties: {
    arguments: '\\"${mockBotApp.properties.defaultHostName}\\" \\"${mockBot.name}\\" \\"${resourceGroup().name}\\"'
    azCliVersion: '2.61.0'
    cleanupPreference: 'Always'
    forceUpdateTag: deployTime
    retentionInterval: 'PT1H' // Minimal retention is 1 hour.
    scriptContent: '''
      set -eo pipefail

      BOT_APP_NAME=$1
      BOT_NAME=$2
      RESOURCE_GROUP_NAME=$3

      az bot update \
        --name $BOT_NAME \
        --resource-group $RESOURCE_GROUP_NAME \
        --endpoint https://$BOT_APP_NAME/api/messages
    '''
    timeout: 'PT2M'
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
  name: '${mockBotName}-save-secret-script'
  properties: {
    arguments: '\\"${mockBot.name}\\" \\"${mockBotDirectLineSecret.name}\\" \\"${keyVault.name}\\" \\"${resourceGroup().name}\\"'
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
          name: '${echoBotName}-direct-line-secret'
        }
        {
          identity: tokenAppIdentity.id
          keyVaultUrl: mockBotDirectLineSecret.properties.secretUri
          name: '${mockBotName}-direct-line-secret'
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
              name: 'ECHO_BOT_APP_HOSTNAME'
              value: echoBotApp.properties.defaultHostName
            }
            {
              name: 'ECHO_BOT_AZURE_CLIENT_ID'
              value: echoBotIdentity.properties.clientId
            }
            {
              name: 'ECHO_BOT_DIRECT_LINE_SECRET'
              secretRef: '${echoBotName}-direct-line-secret'
            }
            {
              name: 'MOCK_BOT_APP_HOSTNAME'
              value: mockBotApp.properties.defaultHostName
            }
            {
              name: 'MOCK_BOT_AZURE_CLIENT_ID'
              value: mockBotIdentity.properties.clientId
            }
            {
              name: 'MOCK_BOT_DIRECT_LINE_SECRET'
              secretRef: '${mockBotName}-direct-line-secret'
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
output echoBotAppName string = echoBotAppName

// Output "echoBotAppURL" for display in GitHub deployment.
output echoBotAppURL string = 'https://${echoBotApp.properties.defaultHostName}/'

// Output "mockBotAppName" for ZIP deployment later.
output mockBotAppName string = mockBotAppName

// Output "mockBotAppURL" for display in GitHub deployment.
output mockBotAppURL string = 'https://${mockBotApp.properties.defaultHostName}/'

// Output "tokenAppURL" for GitHub Pages.
output tokenAppURL string = 'https://${tokenApp.properties.configuration.ingress.fqdn}/'
