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
param webAppName string = '${deploymentFamilyName}-app'

resource builderIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-07-31-preview' existing = {
  name: builderIdentityName
}

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2021-12-01-preview' = {
  name: logAnalyticsName
  location: location
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

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: keyVaultName
  location: location
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

// https://learn.microsoft.com/en-us/azure/templates/microsoft.app/managedenvironments?pivots=deployment-language-bicep
resource containerAppEnvironment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: '${containerAppName}-env'
  location: location
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
  name: containerAppName
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${botIdentity.id}': {}
      '${containerAppIdentity.id}': {}
    }
  }
  location: location
  properties: {
    managedEnvironmentId: containerAppEnvironment.id
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
          name: 'registry-password'
          value: registryPassword
        }
        {
          name: 'direct-line-extension-key'
          identity: containerAppIdentity.id
          keyVaultUrl: directLineExtensionKey.properties.secretUri
        }
        {
          name: 'direct-line-secret'
          identity: containerAppIdentity.id
          keyVaultUrl: directLineSecret.properties.secretUri
        }
      ]
    }
    template: {
      containers: [
        {
          image: '${registryServer}/${imageName}-linux'
          name: containerAppName
          resources: {
            #disable-next-line BCP036
            cpu: '0.25'
            memory: '0.5Gi'
          }
          env: [
            {
              name: 'DIRECT_LINE_EXTENSION_KEY'
              secretRef: 'direct-line-extension-key'
            }
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
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 1
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
    family: '0' // 0 = Windows, 6 = Linux
    name: 'S1'
    tier: 'Standard'
  }
}

resource webApp 'Microsoft.Web/sites@2023-12-01' = {
  location: location
  name: webAppName
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${webAppIdentity.id}': {}
    }
  }
  properties: {
    clientAffinityEnabled: false
    httpsOnly: true
    siteConfig: {
      appSettings: [
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: 'lts'
        }
        {
          name: 'DirectLineExtensionKey'
          value: 'DUMMY'
        }
        {
          name: 'DIRECTLINE_EXTENSION_VERSION'
          value: 'latest'
        }
      ]
      // metadata: [
      //   {
      //     name: 'CURRENT_STACK'
      //     value: 'node'
      //   }
      // ]
      // nodeVersion: '~20'
      // alwaysOn: true
      ftpsState: 'Disabled'
    }
  }
}

resource webAppContainerDeployment 'Microsoft.Web/sites/sitecontainers@2023-12-01' = {
  name: '${webAppName}-deployment'
  parent: webApp
  properties: {
    authType: 'UserCredentials'
    image: '${registryServer}/${imageName}-windows'
    isMain: true
    passwordSecret: registryPassword
    targetPort: '8080'
    userName: registryUsername
  }
}

// resource websiteContributorRoleDefinition 'Microsoft.Authorization/roleDefinitions@2018-01-01-preview' existing = {
//   scope: subscription()
//   name: 'de139f84-1756-47ae-9be6-808fbbe84772'
// }

// resource webAppDeployRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
//   name: '${webAppName}-builder-rbac'
//   properties: {
//     principalId: builderIdentity.properties.principalId
//     roleDefinitionId: websiteContributorRoleDefinition.id
//   }
//   scope: webApp
// }

resource botIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-07-31-preview' = {
  location: location
  name: '${botName}-identity'
}

resource bot 'Microsoft.BotService/botServices@2023-09-15-preview' = {
  kind: 'azurebot'
  name: botName
  location: 'global'
  sku: {
    name: 'S1'
  }
  properties: {
    displayName: botName
    endpoint: 'https://${containerApp.properties.configuration.ingress.fqdn}/api/messages'
    msaAppId: botIdentity.properties.clientId
    msaAppType: 'UserAssignedMSI'
    msaAppMSIResourceId: botIdentity.id
    msaAppTenantId: botIdentity.properties.tenantId
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
    arguments: '\\"${bot.name}\\" \\"${directLineExtensionKey.name}\\" \\"${directLineSecret.name}\\" \\"${keyVault.name}\\" \\"${resourceGroup().name}\\"'
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

      DIRECT_LINE_EXTENSION_KEY=$(az bot directline update --name $BOT_NAME --output json --resource-group $RESOURCE_GROUP_NAME | jq -r ".properties.properties.extensionKey1")
      DIRECT_LINE_SECRET=$(az bot directline update --name $BOT_NAME --output json --resource-group $RESOURCE_GROUP_NAME | jq -r ".properties.properties.sites[0].key")

      az keyvault secret set --name $DIRECT_LINE_EXTENSION_KEY_SECRET_NAME --output none --value $DIRECT_LINE_EXTENSION_KEY --vault-name $KEY_VAULT_NAME
      az keyvault secret set --name $DIRECT_LINE_SECRET_SECRET_NAME --output none --value $DIRECT_LINE_SECRET --vault-name $KEY_VAULT_NAME
    '''
    timeout: 'PT2M'
  }
}
