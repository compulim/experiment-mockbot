metadata description = 'Deploy to Container Apps'

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

param containerAppEnvName string = '${deploymentFamilyName}-env'
param botIdentityName string = '${deploymentFamilyName}-bot-user'
param botName string = '${deploymentFamilyName}-bot'
param containerAppIdentityName string = '${deploymentFamilyName}-app-user'
param containerAppName string = '${deploymentFamilyName}-app'
param keyVaultName string = '${deploymentFamilyName}-key'
  // TODO: Temporarily setting KV to "westus".
param location string = 'westus'
// param location string = resourceGroup().location
param logAnalyticsName string = '${deploymentFamilyName}-log'

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
  name: containerAppIdentityName
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
  name: containerAppEnvName
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
    userAssignedIdentities: {
      '${containerAppIdentity.id}': {}
    }
    type: 'UserAssigned'
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
          image: '${registryServer}/${imageName}'
          name: containerAppName
          resources: {
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

resource botIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-07-31-preview' = {
  location: location
  name: botIdentityName
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

output botIdentityName string = botIdentityName
output botName string = botName
output containerAppEnvName string = containerAppEnvName
output containerAppIdentityName string = containerAppIdentityName
output containerAppName string = containerAppName
output directLineExtensionKeySecretName string = directLineExtensionKey.name
output directLineSecretSecretName string = directLineSecret.name
output keyVaultName string = keyVaultName
