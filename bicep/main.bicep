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

@maxLength(30)
param echoBotDeploymentFamilyName string = '${deploymentFamilyName}-echo-bot'
@maxLength(30)
param mockBotDeploymentFamilyName string = '${deploymentFamilyName}-mock-bot'
@maxLength(30)
param todoBotDeploymentFamilyName string = '${deploymentFamilyName}-todo-bot'
@maxLength(30)
param speechServicesName string = '${deploymentFamilyName}-speech'
param tokenAppName string = '${deploymentFamilyName}-token-app'
param vnetName string = '${deploymentFamilyName}-vnet'

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

// Storage account for deployment scripts
resource deploymentScriptStorageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  location: location
  name: '${replace(deploymentFamilyName, '-', '')}dssa'
  kind: 'StorageV2'
  sku: {
    name: 'Standard_LRS'
  }
  properties: {
    allowBlobPublicAccess: false
    minimumTlsVersion: 'TLS1_2'
    networkAcls: {
      defaultAction: 'Deny'
      bypass: 'AzureServices'
    }
    publicNetworkAccess: 'Disabled'
  }
}

// Private endpoint for storage account
resource deploymentScriptStorageAccountPrivateEndpoint 'Microsoft.Network/privateEndpoints@2023-11-01' = {
  location: location
  name: '${deploymentScriptStorageAccount.name}-endpoint'
  properties: {
    privateLinkServiceConnections: [
      {
        name: '${deploymentScriptStorageAccount.name}-plsc'
        properties: {
          privateLinkServiceId: deploymentScriptStorageAccount.id
          groupIds: [
            'file'
          ]
        }
      }
    ]
    customNetworkInterfaceName: '${deploymentScriptStorageAccount.name}-nic'
    subnet: {
      id: virtualNetwork::keyVaultEndpointSubnet.id
    }
  }
}

// Storage File Data Privileged Contributor role for builder identity. See https://docs.microsoft.com/azure/role-based-access-control/built-in-roles')
resource deploymentScriptStorageFileDataPrivilegedContributorReference 'Microsoft.Authorization/roleDefinitions@2022-04-01' existing = {
  name: '69566ab7-960f-475b-8e7c-b3118f30c6bd'
  scope: tenant()
}

resource builderStorageRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(deploymentScriptStorageAccount.id, builderIdentity.id, deploymentScriptStorageFileDataPrivilegedContributorReference.id)
  properties: {
    principalId: builderIdentity.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: deploymentScriptStorageFileDataPrivilegedContributorReference.id
  }
  scope: deploymentScriptStorageAccount
}

// // Private DNS Zone for Storage
// resource deploymentScriptStoragePrivateDnsZone 'Microsoft.Network/privateDnsZones@2020-06-01' = {
//   location: 'global'
//   name: 'privatelink.blob.${environment().suffixes.storage}'
// }

// // Link Storage DNS Zone to VNet
// resource storagePrivateDnsZoneLink 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2020-06-01' = {
//   location: 'global'
//   name: '${vnetName}-storage-link'
//   parent: deploymentScriptStoragePrivateDnsZone
//   properties: {
//     registrationEnabled: false
//     virtualNetwork: {
//       id: vnet.id
//     }
//   }
// }

// // DNS Zone Group for Storage Private Endpoint
// resource storagePrivateDnsZoneGroup 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2023-11-01' = {
//   name: 'default'
//   parent: deploymentScriptStorageAccountPrivateEndpoint
//   properties: {
//     privateDnsZoneConfigs: [
//       {
//         name: 'privatelink-blob-core-windows-net'
//         properties: {
//           privateDnsZoneId: deploymentScriptStoragePrivateDnsZone.id
//         }
//       }
//     ]
//   }
// }

resource deploymentScriptPrivateDnsZone 'Microsoft.Network/privateDnsZones@2024-06-01' = {
  name: 'privatelink.file.${environment().suffixes.storage}'
  // name: 'privatelink.file.core.windows.net'
  location: 'global'

  resource virtualNetworkLink 'virtualNetworkLinks' = {
    name: uniqueString(virtualNetwork.name)
    location: 'global'
    properties: {
      registrationEnabled: false
      virtualNetwork: {
        id: virtualNetwork.id
      }
    }
  }

  resource resRecord 'A' = {
    name: deploymentScriptStorageAccount.name
    properties: {
      ttl: 10
      aRecords: [
        {
          ipv4Address: first(first(deploymentScriptStorageAccountPrivateEndpoint.properties.customDnsConfigs)!.ipAddresses)
        }
      ]
    }
  }
}

resource virtualNetwork 'Microsoft.Network/virtualNetworks@2025-01-01' = {
  name: vnetName
  location: location
  properties: {
    addressSpace: {
      addressPrefixes: [
        '192.168.4.0/22'
      ]
    }
    subnets: [
      {
        name: 'keyVaultEndpointSubnet'
        properties: {
          addressPrefix: '192.168.4.0/24'
          // Need to solve this chicken-and-egg problem.
          // serviceEndpoints: [
          //   {
          //     service: keyVault
          //   }
          // ]
        }
      }
      {
        name: 'deploymentScriptSubnet'
        properties: {
          addressPrefix: '192.168.5.0/24'
          delegations: [
            {
              name: 'deploymentScriptDelegation'
              properties: {
                serviceName: 'Microsoft.ContainerInstance/containerGroups'
              }
            }
          ]
        }
      }
      {
        name: 'containerAppsEndpointSubnet'
        properties: {
          addressPrefix: '192.168.6.0/24'
          delegations: [
            {
              name: 'containerAppsDelegation'
              properties: {
                serviceName: 'Microsoft.App/environments'
              }
            }
          ]
        }
      }
    ]
  }

  resource containerAppsEndpointSubnet 'subnets' existing = {
    name: 'ContainerAppsEndpointSubnet'
  }

  resource deploymentScriptSubnet 'subnets' existing = {
    name: 'DeploymentScriptSubnet'
  }

  resource keyVaultEndpointSubnet 'subnets' existing = {
    name: 'KeyVaultEndpointSubnet'
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
    // Despite mentioned here, custom sub-domain name is not required to use Entra authentication (i.e. managed identity) for STT/TTS.
    // https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-services-private-link?tabs=portal#adjust-an-application-to-use-a-speech-resource-without-private-endpoints
    // customSubDomainName: speechServicesName
    disableLocalAuth: true
  }
  sku: {
    name: 'S0'
  }
}

resource speechServicesIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-07-31-preview' = {
  location: location
  name: '${speechServicesName}-identity'
}

@description('This is the built-in Cognitive Services Speech User role. See https://docs.microsoft.com/azure/role-based-access-control/built-in-roles#contributor')
resource speechServicesUserRoleDefinition 'Microsoft.Authorization/roleDefinitions@2022-04-01' existing = {
  scope: subscription()
  name: 'f2dc8367-1007-4938-bd23-fe263f013447'
}

resource roleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  // Use GUID to prevent error on recreating role assignment.
  // https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/scenarios-rbac#resource-deletion-behavior
  name: guid(resourceGroup().id, speechServicesIdentity.id, speechServicesUserRoleDefinition.id)
  properties: {
    roleDefinitionId: speechServicesUserRoleDefinition.id
    principalId: speechServicesIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
  scope: speechServices
}

resource speechServicesRotateKeyScript 'Microsoft.Resources/deploymentScripts@2023-08-01' = {
  dependsOn: [
    deploymentScriptStorageAccountPrivateEndpoint
    deploymentScriptPrivateDnsZone::virtualNetworkLink
  ]
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${builderIdentity.id}': {}
    }
  }
  kind: 'AzureCLI'
  location: location
  #disable-next-line use-stable-resource-identifiers
  name: '${speechServices.name}-rotate-key-script'
  properties: {
    arguments: '\\"${speechServices.name}\\" \\"${resourceGroup().name}\\"'
    azCliVersion: '2.61.0'
    cleanupPreference: 'Always'
    containerSettings: {
      containerGroupName: '${speechServices.name}-rotate-key-aci'
      subnetIds: [
        {
          id: virtualNetwork::deploymentScriptSubnet.id
        }
      ]
    }
    forceUpdateTag: deployTime
    retentionInterval: 'PT1H' // Minimal retention is 1 hour.
    scriptContent: '''
      set -eo pipefail

      SPEECH_SERVICES_NAME=$1
      RESOURCE_GROUP_NAME=$2

      az cognitiveservices account keys regenerate \
        --name $SPEECH_SERVICES_NAME \
        --resource-group $RESOURCE_GROUP_NAME \
        --key-name key1
    '''
    storageAccountSettings: {
      storageAccountName: deploymentScriptStorageAccount.name
    }
    timeout: 'PT2M'
  }
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
    networkAcls: {
      bypass: 'AzureServices'
      defaultAction: 'Deny'
      virtualNetworkRules: [
        {
          id: virtualNetwork::keyVaultEndpointSubnet.id
          ignoreMissingVnetServiceEndpoint: false
        }
      ]
    }
    publicNetworkAccess: 'Disabled'
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
    attributes: {
      exp: dateTimeToEpoch(dateTimeAdd(deployTime, 'PT15M'))
    }
    contentType: 'application/vnd.bag-StrongEncConnectionString'
    value: 'PLACEHOLDER' // Creates an empty slot and we will fill it out later.
  }
}

resource mockBotDirectLineSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  name: '${mockBotDeploymentFamilyName}-direct-line-secret'
  parent: keyVault
  properties: {
    attributes: {
      exp: dateTimeToEpoch(dateTimeAdd(deployTime, 'PT15M'))
    }
    contentType: 'application/vnd.bag-StrongEncConnectionString'
    value: 'PLACEHOLDER' // Creates an empty slot and we will fill it out later.
  }
}

resource todoBotDirectLineSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  name: '${todoBotDeploymentFamilyName}-direct-line-secret'
  parent: keyVault
  properties: {
    attributes: {
      exp: dateTimeToEpoch(dateTimeAdd(deployTime, 'PT15M'))
    }
    contentType: 'application/vnd.bag-StrongEncConnectionString'
    value: 'PLACEHOLDER' // Creates an empty slot and we will fill it out later.
  }
}

resource speechServicesSubscriptionKey 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  name: 'speech-services-subscription-key'
  parent: keyVault
  properties: {
    attributes: {
      exp: dateTimeToEpoch(dateTimeAdd(deployTime, 'P7D'))
    }
    contentType: 'application/vnd.bag-StrongEncConnectionString'
    value: speechServices.listKeys().key1
  }
}

// Private Endpoint for Key Vault
resource keyVaultPrivateEndpoint 'Microsoft.Network/privateEndpoints@2023-11-01' = {
  location: location
  name: '${keyVaultName}-endpoint'
  properties: {
    subnet: {
      id: virtualNetwork::keyVaultEndpointSubnet.id
    }
    privateLinkServiceConnections: [
      {
        name: '${keyVaultName}-plsc'
        properties: {
          privateLinkServiceId: keyVault.id
          groupIds: [
            'vault'
          ]
        }
      }
    ]
  }
}

// // Private DNS Zone for Key Vault
// resource keyVaultPrivateDnsZone 'Microsoft.Network/privateDnsZones@2020-06-01' = {
//   location: 'global'
//   name: 'privatelink.vaultcore.azure.net'
// }

// // Link DNS Zone to VNet
// resource keyVaultPrivateDnsZoneLink 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2020-06-01' = {
//   location: 'global'
//   name: '${vnetName}-link'
//   parent: keyVaultPrivateDnsZone
//   properties: {
//     registrationEnabled: false
//     virtualNetwork: {
//       id: virtualNetwork::privateEndpointSubnet.id
//     }
//   }
// }

// // DNS Zone Group for Private Endpoint
// resource keyVaultPrivateDnsZoneGroup 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2023-11-01' = {
//   name: 'default'
//   parent: keyVaultPrivateEndpoint
//   properties: {
//     privateDnsZoneConfigs: [
//       {
//         name: 'privatelink-vaultcore-azure-net'
//         properties: {
//           privateDnsZoneId: keyVaultPrivateDnsZone.id
//         }
//       }
//     ]
//   }
// }

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
  dependsOn: [
    deploymentScriptStorageAccountPrivateEndpoint
    deploymentScriptPrivateDnsZone::virtualNetworkLink
  ]
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
    arguments: '\\"${echoBotWithApp.outputs.directLineSecret}\\" \\"${echoBotDirectLineSecret.name}\\" \\"${keyVault.name}\\" \\"${dateTimeAdd(deployTime, 'P7D')}\\"'
    azCliVersion: '2.61.0'
    cleanupPreference: 'Always'
    containerSettings: {
      containerGroupName: '${echoBotWithApp.name}-save-secret-aci'
      subnetIds: [
        {
          id: virtualNetwork::deploymentScriptSubnet.id
        }
      ]
    }
    forceUpdateTag: deployTime
    retentionInterval: 'PT1H' // Minimal retention is 1 hour.
    scriptContent: '''
      set -eo pipefail

      DIRECT_LINE_SECRET=$1
      DIRECT_LINE_SECRET_SECRET_NAME=$2
      KEY_VAULT_NAME=$3
      EXPIRY=$4

      az keyvault secret set \
        --content-type "application/vnd.bag-StrongEncConnectionString" \
        --expires $EXPIRY \
        --name $DIRECT_LINE_SECRET_SECRET_NAME \
        --output none \
        --value $DIRECT_LINE_SECRET \
        --vault-name $KEY_VAULT_NAME
    '''
    storageAccountSettings: {
      storageAccountName: deploymentScriptStorageAccount.name
    }
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
    speechServicesRegion: speechServices.location
    speechServicesResourceId: speechServices.id
  }
}

resource mockBotKeyVaultSaveSecretScript 'Microsoft.Resources/deploymentScripts@2023-08-01' = {
  dependsOn: [
    deploymentScriptStorageAccountPrivateEndpoint
    deploymentScriptPrivateDnsZone::virtualNetworkLink
  ]
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
    arguments: '\\"${mockBotWithApp.outputs.directLineSecret}\\" \\"${mockBotDirectLineSecret.name}\\" \\"${keyVault.name}\\" \\"${dateTimeAdd(deployTime, 'P7D')}\\"'
    azCliVersion: '2.61.0'
    cleanupPreference: 'Always'
    containerSettings: {
      containerGroupName: '${mockBotDeploymentFamilyName}-save-secret-aci'
      subnetIds: [
        {
          id: virtualNetwork::deploymentScriptSubnet.id
        }
      ]
    }
    forceUpdateTag: deployTime
    retentionInterval: 'PT1H' // Minimal retention is 1 hour.
    scriptContent: '''
      set -eo pipefail

      DIRECT_LINE_SECRET=$1
      DIRECT_LINE_SECRET_SECRET_NAME=$2
      KEY_VAULT_NAME=$3
      EXPIRY=$4

      az keyvault secret set \
        --content-type "application/vnd.bag-StrongEncConnectionString" \
        --expires $EXPIRY \
        --name $DIRECT_LINE_SECRET_SECRET_NAME \
        --output none \
        --value $DIRECT_LINE_SECRET \
        --vault-name $KEY_VAULT_NAME
    '''
    storageAccountSettings: {
      storageAccountName: deploymentScriptStorageAccount.name
    }
    timeout: 'PT2M'
  }
}

resource todoBotIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-07-31-preview' = {
  location: location
  name: '${todoBotDeploymentFamilyName}-identity'
}

module todoBotWithApp 'botWithApp.bicep' = {
  name: todoBotDeploymentFamilyName
  params: {
    botIdentityId: todoBotIdentity.id
    botIdentityClientId: todoBotIdentity.properties.clientId
    botIdentityTenantId: todoBotIdentity.properties.tenantId
    builderIdentityId: builderIdentity.id
    deploymentFamilyName: todoBotDeploymentFamilyName
    deployTime: deployTime
    location: location
  }
}

resource todoBotKeyVaultSaveSecretScript 'Microsoft.Resources/deploymentScripts@2023-08-01' = {
  dependsOn: [
    deploymentScriptStorageAccountPrivateEndpoint
    deploymentScriptPrivateDnsZone::virtualNetworkLink
  ]
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${builderIdentity.id}': {}
    }
  }
  kind: 'AzureCLI'
  location: location
  #disable-next-line use-stable-resource-identifiers
  name: '${todoBotWithApp.name}-save-secret-script'
  properties: {
    arguments: '\\"${todoBotWithApp.outputs.directLineSecret}\\" \\"${todoBotDirectLineSecret.name}\\" \\"${keyVault.name}\\" \\"${dateTimeAdd(deployTime, 'P7D')}\\"'
    azCliVersion: '2.61.0'
    cleanupPreference: 'Always'
    containerSettings: {
      containerGroupName: '${todoBotWithApp.name}-save-secret-aci'
      subnetIds: [
        {
          id: virtualNetwork::deploymentScriptSubnet.id
        }
      ]
    }
    forceUpdateTag: deployTime
    retentionInterval: 'PT1H' // Minimal retention is 1 hour.
    scriptContent: '''
      set -eo pipefail

      DIRECT_LINE_SECRET=$1
      DIRECT_LINE_SECRET_SECRET_NAME=$2
      KEY_VAULT_NAME=$3
      EXPIRY=$4

      az keyvault secret set \
        --content-type "application/vnd.bag-StrongEncConnectionString" \
        --expires $EXPIRY \
        --name $DIRECT_LINE_SECRET_SECRET_NAME \
        --output none \
        --value $DIRECT_LINE_SECRET \
        --vault-name $KEY_VAULT_NAME
    '''
    storageAccountSettings: {
      storageAccountName: deploymentScriptStorageAccount.name
    }
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
    vnetConfiguration: {
      infrastructureSubnetId: virtualNetwork::containerAppsEndpointSubnet.id
    }
    workloadProfiles: [
      {
        name: 'Consumption'
        workloadProfileType: 'Consumption'
      }
    ]
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
      '${todoBotIdentity.id}': {}
      '${tokenAppIdentity.id}': {}
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
        {
          identity: tokenAppIdentity.id
          keyVaultUrl: todoBotDirectLineSecret.properties.secretUri
          name: '${todoBotDeploymentFamilyName}-direct-line-secret'
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
              name: 'TODO_BOT_APP_HOST_NAME'
              value: todoBotWithApp.outputs.appDefaultHostName
            }
            {
              name: 'TODO_BOT_AZURE_CLIENT_ID'
              value: todoBotIdentity.properties.clientId
            }
            {
              name: 'TODO_BOT_DIRECT_LINE_SECRET'
              secretRef: '${todoBotDeploymentFamilyName}-direct-line-secret'
            }
            {
              name: 'TRUSTED_ORIGINS'
              // value: ''
              // value: 'https://compulim.github.io,https://localhost'
              value: 'https://compulim.github.io,https://*.local-credentialless.webcontainer-app.io,https://webchat2,http://webchat2,http://webchat,http://localhost:5000,https://microsoft.github.io,http://localhost:5001,http://localhost:8000,http://localhost:5080'
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

// Output "todoBotAppName" for ZIP deployment later.
output todoBotAppName string = todoBotWithApp.outputs.appName

// Output "todoBotAppURL" for display in GitHub deployment.
output todoBotAppURL string = todoBotWithApp.outputs.appURL

// Output "tokenAppURL" for GitHub Pages.
output tokenAppURL string = 'https://${tokenApp.properties.configuration.ingress.fqdn}/'
