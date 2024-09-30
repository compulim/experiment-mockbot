import { ServiceClient } from '@azure/core-client';
import { createHttpHeaders } from '@azure/core-rest-pipeline';
import { ManagedIdentityCredential } from '@azure/identity';
import { object, parse, string } from 'valibot';

const envSchema = object({
  SPEECH_SERVICES_AZURE_CLIENT_ID: string(),
  SPEECH_SERVICES_REGION: string(),
  SPEECH_SERVICES_RESOURCE_ID: string(),
  SPEECH_SERVICES_SUBSCRIPTION_KEY: string()
});

export default async function issueSpeechServicesAccessToken(
  init: { bot?: 'echo bot' | 'mock bot' | undefined; useManagedIdentity?: boolean | undefined } = {}
): Promise<Readonly<{ token: string }>> {
  const {
    SPEECH_SERVICES_AZURE_CLIENT_ID,
    SPEECH_SERVICES_REGION,
    SPEECH_SERVICES_RESOURCE_ID,
    SPEECH_SERVICES_SUBSCRIPTION_KEY
  } = parse(envSchema, process.env);

  // https://github.com/MicrosoftDocs/azure-docs/blob/main/articles/ai-services/speech-service/includes/cognitive-services-speech-service-rest-auth.md
  if (init.useManagedIdentity) {
    const tokenCredential = new ManagedIdentityCredential({ clientId: SPEECH_SERVICES_AZURE_CLIENT_ID });

    // https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-configure-azure-ad-auth?tabs=portal&pivots=programming-language-csharp#get-a-microsoft-entra-access-token
    // const accessToken = await tokenCredential.getToken('https://cognitiveservices.azure.com');
    const accessToken = await tokenCredential.getToken(['https://cognitiveservices.azure.com/.default']);

    // Currently bugged, this authorization token cannot be used for Web Socket and not for issuing another token.
    return { token: `aad#${SPEECH_SERVICES_RESOURCE_ID}#${accessToken.token}` };
  }

  const client = new ServiceClient();
  const headers = createHttpHeaders();

  headers.set('ocp-apim-subscription-key', SPEECH_SERVICES_SUBSCRIPTION_KEY);

  const response = await client.sendRequest({
    headers,
    method: 'POST',
    requestId: '',
    timeout: 15_000,
    url: `https://${SPEECH_SERVICES_REGION}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
    withCredentials: false
  });

  if (response.status === 200) {
    return Object.freeze({ token: response.bodyAsText || '' });
  }

  console.error(response.bodyAsText);

  throw new Error(`Speech Services returned ${response.status}.`);
}
