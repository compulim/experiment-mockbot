metadata description = 'Deploy to Azure'

@description('Family name of the deployment.')
param deploymentFamilyName string

@description('Token service image name and tag.')
param tokenServiceImageName string

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

param botAppName string = '${deploymentFamilyName}-bot-app'
param botName string = '${deploymentFamilyName}-bot'
param keyVaultName string = '${deploymentFamilyName}-key'
param logAnalyticsName string = '${deploymentFamilyName}-log'
param speechServicesName string = '${deploymentFamilyName}-speech'
param tokenServiceAppName string = '${deploymentFamilyName}-token-app'

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

resource tokenServiceAppIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-07-31-preview' = {
  location: location
  name: '${tokenServiceAppName}-identity'
}

resource speechServices 'Microsoft.CognitiveServices/accounts@2024-04-01-preview' = {
  kind: 'SpeechServices'
  location: location
  name: speechServicesName
  properties: {}
  sku: {
    name: 'S0'
  }

  // TODO: Should add role assignment for "tokenServiceAppIdentity".
}

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  location: location
  name: keyVaultName
  properties: {
    accessPolicies: [
      {
        objectId: tokenServiceAppIdentity.properties.principalId
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

resource directLineSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  name: 'direct-line-secret'
  parent: keyVault
  properties: {
    value: 'DUMMY' // Creates an empty slot and we will fill it out later.
  }
}

resource directLineExtensionKey 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  name: 'direct-line-extension-key'
  parent: keyVault
  properties: {
    value: 'DUMMY' // Creates an empty slot and we will fill it out later.
  }
}

resource speechServicesSubscriptionKey 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  name: 'speech-services-subscription-key'
  parent: keyVault
  properties: {
    value: speechServices.listKeys().key1
  }
}

// https://learn.microsoft.com/en-us/azure/templates/microsoft.app/managedenvironments?pivots=deployment-language-bicep
resource tokenServiceAppEnvironment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  location: location
  name: '${tokenServiceAppName}-env'
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

resource tokenServiceApp 'Microsoft.App/containerApps@2024-03-01' = {
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${tokenServiceAppIdentity.id}': {}
      // TODO: Add speech identity
    }
  }
  location: location
  name: tokenServiceAppName
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
          identity: tokenServiceAppIdentity.id
          keyVaultUrl: directLineSecret.properties.secretUri
          name: 'direct-line-secret'
        }
        {
          name: 'registry-password'
          value: registryPassword
        }
        {
          identity: tokenServiceAppIdentity.id
          keyVaultUrl: speechServicesSubscriptionKey.properties.secretUri
          name: 'speech-services-subscription-key'
        }
      ]
    }
    managedEnvironmentId: tokenServiceAppEnvironment.id
    template: {
      containers: [
        {
          env: [
            {
              name: 'DIRECT_LINE_SECRET'
              secretRef: 'direct-line-secret'
            }
            {
              name: 'SPEECH_SERVICES_SUBSCRIPTION_KEY'
              secretRef: 'speech-services-subscription-key'
            }
          ]
          image: '${registryServer}/${tokenServiceImageName}'
          name: tokenServiceAppName
          resources: {
            #disable-next-line BCP036
            cpu: '0.25'
            memory: '0.5Gi'
          }
        }
      ]
      scale: {
        maxReplicas: 1
        minReplicas: 0
      }
    }
  }
}

resource botAppIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-07-31-preview' = {
  location: location
  name: '${botAppName}-identity'
}

resource botAppPlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  location: location
  name: '${botAppName}-plan'
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

resource botApp 'Microsoft.Web/sites@2023-12-01' = {
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${botAppIdentity.id}': {}
      '${botIdentity.id}': {}
    }
  }
  location: location
  name: botAppName
  properties: {
    clientAffinityEnabled: false
    httpsOnly: true
    serverFarmId: botAppPlan.id
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
          value: 'DUMMY' // Will set extension key (via DeploymentScript) after bot registration is up.
        }
        {
          name: 'MicrosoftAppId'
          value: botIdentity.properties.clientId
        }
        {
          name: 'MicrosoftAppTenantId'
          value: botIdentity.properties.tenantId
        }
        {
          name: 'MicrosoftAppType'
          value: 'UserAssignedMSI'
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
    }
  }
}

resource botIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-07-31-preview' = {
  location: location
  name: '${botName}-identity'
}

resource bot 'Microsoft.BotService/botServices@2023-09-15-preview' = {
  kind: 'azurebot'
  location: 'global'
  name: botName
  properties: {
    displayName: botName
    // endpoint: 'https://${containerApp.properties.configuration.ingress.fqdn}/api/messages'
    endpoint: 'https://${botApp.properties.defaultHostName}/api/messages'
    msaAppId: botIdentity.properties.clientId
    msaAppMSIResourceId: botIdentity.id
    msaAppTenantId: botIdentity.properties.tenantId
    msaAppType: 'UserAssignedMSI'
  }
  sku: {
    name: 'S1'
  }
}

resource botDirectLineChannel 'Microsoft.BotService/botServices/channels@2023-09-15-preview' = {
  name: 'DirectLineChannel'
  parent: bot
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

resource botWebChatChannel 'Microsoft.BotService/botServices/channels@2023-09-15-preview' = {
  name: 'WebChatChannel'
  parent: bot
  properties: {
    channelName: 'WebChatChannel'
    properties: {
      sites: [] // Remove all sites
    }
  }
}

resource saveSecretScript 'Microsoft.Resources/deploymentScripts@2023-08-01' = {
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${builderIdentity.id}': {}
    }
  }
  kind: 'AzureCLI'
  location: location
  #disable-next-line use-stable-resource-identifiers
  name: 'save-secret-script'
  properties: {
    arguments: '\\"${bot.name}\\" \\"${directLineExtensionKey.name}\\" \\"${directLineSecret.name}\\" \\"${keyVault.name}\\" \\"${resourceGroup().name}\\" \\"${botApp.name}\\"'
    azCliVersion: '2.61.0'
    cleanupPreference: 'Always'
    forceUpdateTag: deployTime
    retentionInterval: 'PT1H' // Minimal retention is 1 hour.
    scriptContent: '''
      set -eo pipefail

      BOT_NAME=$1
      DIRECT_LINE_EXTENSION_KEY_SECRET_NAME=$2
      DIRECT_LINE_SECRET_SECRET_NAME=$3
      KEY_VAULT_NAME=$4
      RESOURCE_GROUP_NAME=$5
      WEB_APP_NAME=$6

      DIRECT_LINE_EXTENSION_KEY=$(az bot directline update --name $BOT_NAME --output json --resource-group $RESOURCE_GROUP_NAME | jq -r ".properties.properties.extensionKey1")
      DIRECT_LINE_SECRET=$(az bot directline update --name $BOT_NAME --output json --resource-group $RESOURCE_GROUP_NAME | jq -r ".properties.properties.sites[0].key")

      az keyvault secret set \
        --name $DIRECT_LINE_EXTENSION_KEY_SECRET_NAME \
        --output none \
        --value $DIRECT_LINE_EXTENSION_KEY \
        --vault-name $KEY_VAULT_NAME

      az keyvault secret set \
        --name $DIRECT_LINE_SECRET_SECRET_NAME \
        --output none \
        --value $DIRECT_LINE_SECRET \
        --vault-name $KEY_VAULT_NAME

      az webapp config appsettings set \
        --resource-group $RESOURCE_GROUP_NAME \
        --name $WEB_APP_NAME \
        --output none \
        --settings DirectLineExtensionKey=$DIRECT_LINE_EXTENSION_KEY
    '''
    timeout: 'PT2M'
  }
}

// Output "botAppName" for ZIP deployment later.
output botAppName string = botAppName
