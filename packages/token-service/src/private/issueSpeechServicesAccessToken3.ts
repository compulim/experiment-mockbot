import { ServiceClient } from '@azure/core-client';
import { createHttpHeaders } from '@azure/core-rest-pipeline';
import { object, parse, string } from 'valibot';

const envSchema = object({
  AZURE_CLIENT_ID: string(),
  IDENTITY_ENDPOINT: string(),
  IDENTITY_HEADER: string(),
  SPEECH_SERVICES_REGION: string(),
  SPEECH_SERVICES_RESOURCE_ID: string()
});

const managedIdentityTokenSchema = object({
  access_token: string()
});

// const speechServicesIssueTokenResponse = object({
//   token: string()
// });

export default async function issueSpeechServicesAccessToken3(): Promise<Readonly<{ token: string }>> {
  const { AZURE_CLIENT_ID, IDENTITY_ENDPOINT, IDENTITY_HEADER, SPEECH_SERVICES_REGION, SPEECH_SERVICES_RESOURCE_ID } = parse(
    envSchema,
    process.env
  );
  // https://github.com/MicrosoftDocs/azure-docs/blob/main/articles/ai-services/speech-service/includes/cognitive-services-speech-service-rest-auth.md

  const identityURL = new URL(IDENTITY_ENDPOINT);

  identityURL.searchParams.set('accept', 'application/json');
  identityURL.searchParams.set('api-version', '2019-08-01');
  identityURL.searchParams.set('client_id', AZURE_CLIENT_ID);
  identityURL.searchParams.set('resource', 'https://vault.azure.net');

  const res = await fetch(identityURL, { headers: { 'x-identity-header': IDENTITY_HEADER } });

  if (!res.ok) {
    console.error(await res.text());

    throw new Error(`Failed to get token for managed identity, server returned ${res.status}.`);
  }

  const token = parse(managedIdentityTokenSchema, await res.json()).access_token;

  // const credential = new DefaultAzureCredential();
  // const credential = new ManagedIdentityCredential({ clientId: AZURE_CLIENT_ID });

  console.log(token);

  const client = new ServiceClient();
  const headers = createHttpHeaders();

  headers.set('authorization', `Bearer aad#${SPEECH_SERVICES_RESOURCE_ID}#${token}`);

  const response = await client.sendRequest({
    headers,
    method: 'POST',
    requestId: '',
    timeout: 15_000,
    url: `https://${SPEECH_SERVICES_REGION}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
    withCredentials: false
  });

  if (response.status === 200) {
    // return parse(speechServicesIssueTokenResponse, JSON.parse(response.bodyAsText || ''));
    return Object.freeze({ token: response.bodyAsText || '' });
  }

  console.log(response.bodyAsText);

  throw new Error(`Speech Services returned ${response.status}.`);
}
