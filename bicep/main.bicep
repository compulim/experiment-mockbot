metadata description = 'Deploy to Azure'

@description('Family name of the deployment.')
param deploymentFamilyName string

@description('Image name and tag.')
param imageName string

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

param botName string = '${deploymentFamilyName}-bot'
param containerAppName string = '${deploymentFamilyName}-container'
param keyVaultName string = '${deploymentFamilyName}-key'
param logAnalyticsName string = '${deploymentFamilyName}-log'
param speechServicesName string = '${deploymentFamilyName}-speech'
param webAppName string = '${deploymentFamilyName}-app'

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

resource containerAppIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-07-31-preview' = {
  location: location
  name: '${containerAppName}-identity'
}

resource speechServices 'Microsoft.CognitiveServices/accounts@2024-04-01-preview' = {
  kind: 'SpeechServices'
  location: location
  name: speechServicesName
  sku: {
    name: 'S0'
  }
}

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  location: location
  name: keyVaultName
  properties: {
    accessPolicies: [
      {
        objectId: containerAppIdentity.properties.principalId
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
resource containerAppEnvironment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  location: location
  name: '${containerAppName}-env'
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

resource containerApp 'Microsoft.App/containerApps@2024-03-01' = {
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${botIdentity.id}': {}
      '${containerAppIdentity.id}': {}
    }
  }
  location: location
  name: containerAppName
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
          identity: containerAppIdentity.id
          keyVaultUrl: directLineExtensionKey.properties.secretUri
          name: 'direct-line-extension-key'
        }
        {
          identity: containerAppIdentity.id
          keyVaultUrl: directLineSecret.properties.secretUri
          name: 'direct-line-secret'
        }
        {
          name: 'registry-password'
          value: registryPassword
        }
        {
          identity: containerAppIdentity.id
          keyVaultUrl: speechServicesSubscriptionKey.properties.secretUri
          name: 'speech-services-subscription-key'
        }
      ]
    }
    managedEnvironmentId: containerAppEnvironment.id
    template: {
      containers: [
        {
          env: [
            {
              name: 'DIRECT_LINE_SECRET'
              secretRef: 'direct-line-secret'
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
          ]
          image: '${registryServer}/${imageName}'
          name: containerAppName
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

resource webAppIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-07-31-preview' = {
  location: location
  name: '${webAppName}-identity'
}

resource webAppPlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  location: location
  name: '${webAppName}-plan'
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

resource webApp 'Microsoft.Web/sites@2023-12-01' = {
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${botIdentity.id}': {}
      '${webAppIdentity.id}': {}
    }
  }
  location: location
  name: webAppName
  properties: {
    clientAffinityEnabled: false
    httpsOnly: true
    serverFarmId: webAppPlan.id
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
          value: 'DUMMY'
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
    endpoint: 'https://${webApp.properties.defaultHostName}/api/messages'
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
    arguments: '\\"${bot.name}\\" \\"${directLineExtensionKey.name}\\" \\"${directLineSecret.name}\\" \\"${keyVault.name}\\" \\"${resourceGroup().name}\\" \\"${webApp.name}\\"'
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

      az keyvault secret set --name $DIRECT_LINE_EXTENSION_KEY_SECRET_NAME --output none --value $DIRECT_LINE_EXTENSION_KEY --vault-name $KEY_VAULT_NAME
      az keyvault secret set --name $DIRECT_LINE_SECRET_SECRET_NAME --output none --value $DIRECT_LINE_SECRET --vault-name $KEY_VAULT_NAME

      az webapp config appsettings set --resource-group $RESOURCE_GROUP_NAME --name $WEB_APP_NAME --output none --settings DirectLineExtensionKey=$DIRECT_LINE_EXTENSION_KEY
    '''
    timeout: 'PT2M'
  }
}

output webAppName string = webAppName
