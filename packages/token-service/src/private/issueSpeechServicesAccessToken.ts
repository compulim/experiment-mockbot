import { ServiceClient } from '@azure/core-client';
import { createHttpHeaders } from '@azure/core-rest-pipeline';
import { ManagedIdentityCredential } from '@azure/identity';
import { object, parse, string, type InferOutput } from 'valibot';

const envSchema = object({
  SPEECH_SERVICES_REGION: string(),
  SPEECH_SERVICES_SUBSCRIPTION_KEY: string()
});

const speechServicesIssueTokenResponse = object({
  token: string()
});

export default async function issueSpeechServicesAccessToken(
  init: { useManagedIdentity?: boolean | undefined } = {}
): Promise<Readonly<{ token: string }>> {
  const { SPEECH_SERVICES_REGION, SPEECH_SERVICES_SUBSCRIPTION_KEY } = parse(envSchema, process.env);
  let authorization;

  if (init.useManagedIdentity) {
    const tokenCredential = new ManagedIdentityCredential({});

    const accessToken = await tokenCredential.getToken([]);

    console.log(accessToken.token);

    authorization = `Bearer ${accessToken.token}`;
  } else {
    authorization = `Bearer ${SPEECH_SERVICES_SUBSCRIPTION_KEY}`;
  }

  const client = new ServiceClient();

  // https://github.com/MicrosoftDocs/azure-docs/blob/main/articles/ai-services/speech-service/includes/cognitive-services-speech-service-rest-auth.md
  const response = await client.sendRequest({
    // headers: createHttpHeaders({ authorization: `#aad#` }),
    headers: createHttpHeaders({ authorization }),
    method: 'POST',
    requestId: '',
    timeout: 15_000,
    url: `https://${SPEECH_SERVICES_REGION}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
    withCredentials: false
  });

  if (response.status === 200) {
    return parse(speechServicesIssueTokenResponse, JSON.parse(response.bodyAsText || ''));
  }

  throw new Error('Speech Services returned non-200.');
}
