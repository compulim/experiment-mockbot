metadata description = 'Deploy a bot with web apps'

param builderIdentityId string

@description('Family name of the deployment.')
@maxLength(40)
param deploymentFamilyName string

param deployTime string = utcNow()
param location string
param botIdentityClientId string
param botIdentityId string
param botIdentityTenantId string

resource bot 'Microsoft.BotService/botServices@2022-09-15' = {
  kind: 'azurebot'
  location: 'global'
  name: '${deploymentFamilyName}-bot'
  properties: {
    displayName: '${deploymentFamilyName}-bot'
    endpoint: 'https://dummy.localhost/api/messages' // Chicken-and-egg problem, we will set it later.
    msaAppId: botIdentityClientId
    msaAppMSIResourceId: botIdentityId
    msaAppTenantId: botIdentityTenantId
    msaAppType: 'UserAssignedMSI'
  }
  sku: {
    name: 'S1'
  }
}

resource botDummyOAuthConnection 'Microsoft.BotService/botServices/connections@2022-09-15' = {
  location: 'global' // Required. If not set, will error out with "The value for property 'location' in the input object cannot be empty."
  name: '${bot.name}-oauth'
  parent: bot
  properties: {
    clientId: 'dummy'
    clientSecret: 'dummy'
    id: 'dummy'
    name: 'Dummy'
    serviceProviderId: 'd05eaacf-1593-4603-9c6c-d4d8fffa46cb' // "GitHub"
  }
}

resource botDirectLineChannel 'Microsoft.BotService/botServices/channels@2022-09-15' = {
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
// resource echoBotDirectLineSpeechChannel 'Microsoft.BotService/botServices/channels@2022-09-15' = {
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
resource botDirectLineSpeechChannel 'Microsoft.BotService/botServices/channels@2022-09-15' = {
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

resource botWebChatChannel 'Microsoft.BotService/botServices/channels@2022-09-15' = {
  name: 'WebChatChannel'
  parent: bot
  properties: {
    channelName: 'WebChatChannel'
    properties: {
      sites: [] // Remove all sites
    }
  }
}

resource appIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-07-31-preview' = {
  location: location
  name: '${deploymentFamilyName}-app-identity'
}

resource appPlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  location: location
  name: '${deploymentFamilyName}-app-plan'
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

resource app 'Microsoft.Web/sites@2023-12-01' = {
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${appIdentity.id}': {}
      '${botIdentityId}': {}
    }
  }
  location: location
  name: '${deploymentFamilyName}-app'
  properties: {
    clientAffinityEnabled: false
    httpsOnly: true
    serverFarmId: appPlan.id
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
          value: botIdentityClientId
        }
        {
          name: 'MicrosoftAppTenantId'
          value: botIdentityTenantId
        }
        {
          name: 'MicrosoftAppType'
          value: 'UserAssignedMSI'
        }
        {
          name: 'OAUTH_CONNECTION_NAME'
          value: botDummyOAuthConnection.name
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
      '${builderIdentityId}': {}
    }
  }
  kind: 'AzureCLI'
  location: location
  #disable-next-line use-stable-resource-identifiers
  name: '${bot.name}-script'
  properties: {
    arguments: '\\"${app.properties.defaultHostName}\\" \\"${bot.name}\\" \\"${resourceGroup().name}\\"'
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

output appDefaultHostName string = app.properties.defaultHostName
output appName string = app.name
output appURL string = 'https://${app.properties.defaultHostName}/'
output botName string = bot.name
