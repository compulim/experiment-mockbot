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

param botAppName string = '${deploymentFamilyName}-bot-app'
param botName string = '${deploymentFamilyName}-bot'
param keyVaultName string = '${deploymentFamilyName}-key'
param logAnalyticsName string = '${deploymentFamilyName}-log'
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

resource directLineSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  name: 'direct-line-secret'
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
    endpoint: 'https://dummy.localhost/api/messages' // Chicken-and-egg problem, we will set it later.
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

// Direct Line Speech is not working with `disableLocalAuth`, need investigations.
// resource botDirectLineSpeechChannel 'Microsoft.BotService/botServices/channels@2023-09-15-preview' = {
//   location: 'global' // Required. If not set, will error out with "The value for property 'location' in the input object cannot be empty."
//   name: 'DirectLineSpeechChannel'
//   parent: bot
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
resource botDirectLineSpeechChannel 'Microsoft.BotService/botServices/channels@2023-09-15-preview' = {
  location: 'global' // Required. If not set, will error out with "The value for property 'location' in the input object cannot be empty."
  name: 'DirectLineSpeechChannel'
  parent: bot
  properties: {
    channelName: 'DirectLineSpeechChannel'
    properties: {
      isEnabled: false
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
          value: botDirectLineChannel.properties.properties.extensionKey1
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
      webSocketsEnabled: true
    }
  }
}

resource botReconfigureScript 'Microsoft.Resources/deploymentScripts@2023-08-01' = {
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${builderIdentity.id}': {}
    }
  }
  kind: 'AzureCLI'
  location: location
  #disable-next-line use-stable-resource-identifiers
  name: '${bot.name}-script'
  properties: {
    arguments: '\\"${botApp.properties.defaultHostName}\\" \\"${bot.name}\\" \\"${resourceGroup().name}\\"'
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

resource keyVaultSaveSecretScript 'Microsoft.Resources/deploymentScripts@2023-08-01' = {
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${builderIdentity.id}': {}
    }
  }
  kind: 'AzureCLI'
  location: location
  #disable-next-line use-stable-resource-identifiers
  name: '${keyVaultName}-script'
  properties: {
    arguments: '\\"${bot.name}\\" \\"${directLineSecret.name}\\" \\"${keyVault.name}\\" \\"${resourceGroup().name}\\"'
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
    keyVaultSaveSecretScript
  ]
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
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
          keyVaultUrl: directLineSecret.properties.secretUri
          name: 'direct-line-secret'
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
            {
              name: 'AZURE_CLIENT_ID'
              value: tokenAppIdentity.properties.clientId
            }
            // {
            //   name: 'AZURE_LOG_LEVEL'
            //   value: 'verbose'
            // }
            {
              name: 'BOT_APP_HOSTNAME'
              value: botApp.properties.defaultHostName
            }
            {
              name: 'DIRECT_LINE_SECRET'
              secretRef: 'direct-line-secret'
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
        minReplicas: 0
      }
    }
  }
}

// Output "botAppName" for ZIP deployment later.
output botAppName string = botAppName

// Output "botAppURL" for display in GitHub deployment.
output botAppURL string = 'https://${botApp.properties.defaultHostName}/'

// Output "tokenAppURL" for GitHub Pages.
output tokenAppURL string = 'https://${tokenApp.properties.configuration.ingress.fqdn}/'
