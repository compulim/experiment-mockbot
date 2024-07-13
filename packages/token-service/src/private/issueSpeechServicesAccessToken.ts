import { ServiceClient } from '@azure/core-client';
import { createHttpHeaders } from '@azure/core-rest-pipeline';
import { ManagedIdentityCredential } from '@azure/identity';
import { object, parse, string } from 'valibot';

const envSchema = object({
  AZURE_CLIENT_ID: string(),
  SPEECH_SERVICES_REGION: string(),
  SPEECH_SERVICES_RESOURCE_ID: string(),
  SPEECH_SERVICES_SUBSCRIPTION_KEY: string()
});

// const speechServicesIssueTokenResponse = object({
//   token: string()
// });

export default async function issueSpeechServicesAccessToken(
  init: { useManagedIdentity?: boolean | undefined } = {}
): Promise<Readonly<{ token: string }>> {
  const { AZURE_CLIENT_ID, SPEECH_SERVICES_REGION, SPEECH_SERVICES_RESOURCE_ID, SPEECH_SERVICES_SUBSCRIPTION_KEY } =
    parse(envSchema, process.env);
  const headers = createHttpHeaders();

  // https://github.com/MicrosoftDocs/azure-docs/blob/main/articles/ai-services/speech-service/includes/cognitive-services-speech-service-rest-auth.md
  if (init.useManagedIdentity) {
    const tokenCredential = new ManagedIdentityCredential({ clientId: AZURE_CLIENT_ID });

    const accessToken = await tokenCredential.getToken([]);

    console.log(accessToken.token);

    // headers.set('authorization', `Bearer ${accessToken.token}`);
    headers.set('authorization', `Bearer aad#${SPEECH_SERVICES_RESOURCE_ID}#${accessToken.token}`);
  } else {
    headers.set('ocp-apim-subscription-key', SPEECH_SERVICES_SUBSCRIPTION_KEY);
  }

  const client = new ServiceClient();

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
