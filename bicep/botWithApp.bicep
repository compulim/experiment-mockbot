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
param speechServicesRegion string = ''
param speechServicesResourceId string = ''

@secure()
param dummyClientSecret string = 'DUMMY-SECRET-${newGuid()}'

resource bot 'Microsoft.BotService/botServices@2022-09-15' = {
  kind: 'azurebot'
  location: 'global'
  name: '${deploymentFamilyName}-bot'
  properties: {
    displayName: '${deploymentFamilyName}-bot'
    endpoint: 'https://dummy.localhost/api/messages' // Chicken-and-egg problem, we will set it later.
    isStreamingSupported: true
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
    clientSecret: dummyClientSecret
    id: 'dummy'
    name: 'Dummy'
    serviceProviderId: 'd05eaacf-1593-4603-9c6c-d4d8fffa46cb' // "GitHub"
  }
}

// We want to rotate Direct Line secret. However, AZ CLI cannot rotate ABS secrets and ABS ARM template cannot recreate site.
// We need to purge Direct Line channel and recreate them.
resource botCreateDirectLineChannelScript 'Microsoft.Resources/deploymentScripts@2023-08-01' = {
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${builderIdentityId}': {}
    }
  }
  kind: 'AzureCLI'
  location: location
  #disable-next-line use-stable-resource-identifiers
  name: '${deploymentFamilyName}-create-direct-line-channel-script'
  properties: {
    arguments: '\\"${deploymentFamilyName}-bot\\" \\"${resourceGroup().name}\\" \\"Default Site (${deployTime})\\"'
    azCliVersion: '2.61.0'
    cleanupPreference: 'Always'
    forceUpdateTag: deployTime
    retentionInterval: 'PT1H' // Minimal retention is 1 hour.
    scriptContent: '''
      set -eo pipefail

      BOT_NAME=$1
      RESOURCE_GROUP_NAME=$2
      SITE_NAME=$3

      # "create" will remove all other sites.
      az bot directline create \
        --name $BOT_NAME \
        --resource-group $RESOURCE_GROUP_NAME \
        --location global \
        --site-name "$SITE_NAME" \
        --trusted-origins https://compulim.github.io

      az bot directline show \
        --name $BOT_NAME \
        --resource-group $RESOURCE_GROUP_NAME \
        --with-secrets \
        | jq '.setting.sites[0]' \
        | tee $AZ_SCRIPTS_OUTPUT_PATH
    '''
    timeout: 'PT2M'
  }
}

// This section is commented out, we are creating new Direct Line site using "az cli" instead, so we can do key rotation.
// resource botDirectLineChannel 'Microsoft.BotService/botServices/channels@2022-09-15' = {
//   location: 'global' // Required. If not set, will error out with "The value for property 'location' in the input object cannot be empty."
//   name: 'DirectLineChannel' // ABS mistook this name as the properties.channelName. This must be "XXXChannel" otherwise it will throw CHANNEL_NOT_SUPPORTED error.
//   parent: bot
//   properties: {
//     channelName: 'DirectLineChannel'
//     properties: {
//       sites: [
//         {
//           isEnabled: true
//           isSecureSiteEnabled: true
//           isV1Enabled: false
//           isV3Enabled: true
//           siteName: 'Default Site (${deployTime})'
//           trustedOrigins: [
//             'https://compulim.github.io'
//           ]
//         }
//       ]
//     }
//   }
// }

// Direct Line Speech is not working with `disableLocalAuth`, need investigations.
resource botDirectLineSpeechChannel 'Microsoft.BotService/botServices/channels@2022-09-15' = if (speechServicesResourceId != '') {
  location: 'global' // Required. If not set, will error out with "The value for property 'location' in the input object cannot be empty."
  name: 'DirectLineSpeechChannel' // ABS mistook this name as the properties.channelName. This must be "XXXChannel" otherwise it will throw CHANNEL_NOT_SUPPORTED error.
  parent: bot
  properties: {
    channelName: 'DirectLineSpeechChannel'
    properties: {
      cognitiveServiceRegion: speechServicesRegion
      cognitiveServiceResourceId: speechServicesResourceId
      // cognitiveServiceSubscriptionKey: speechServices.listKeys().key1
      // customSpeechModelId: ''
      // customVoiceDeploymentId: ''
      isEnabled: true
    }
  }
}

// // Disable Direct Line Speech for now.
// resource botDirectLineSpeechChannel 'Microsoft.BotService/botServices/channels@2022-09-15' = {
//   location: 'global' // Required. If not set, will error out with "The value for property 'location' in the input object cannot be empty."
//   name: 'DirectLineSpeechChannel' // ABS mistook this name as the properties.channelName. This must be "XXXChannel" otherwise it will throw CHANNEL_NOT_SUPPORTED error.
//   parent: bot
//   properties: {
//     channelName: 'DirectLineSpeechChannel'
//     properties: {
//       isEnabled: false
//     }
//   }
// }

resource botWebChatChannel 'Microsoft.BotService/botServices/channels@2022-09-15' = {
  name: 'WebChatChannel' // ABS mistook this name as the properties.channelName. This must be "XXXChannel" otherwise it will throw CHANNEL_NOT_SUPPORTED error.
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
          // value: botDirectLineChannel.properties.properties.extensionKey1
          value: botCreateDirectLineChannelScript.properties.outputs.extensionKey1
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

// We need to create ABS before Web Apps because we need "DL ASE Extension key" to set in Web Apps.
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
  name: '${deploymentFamilyName}-reconfigure-script'
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

@secure()
output directLineSecret string = botCreateDirectLineChannelScript.properties.outputs.key
