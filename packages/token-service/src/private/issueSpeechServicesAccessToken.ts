import { ServiceClient } from '@azure/core-client';
import { createHttpHeaders } from '@azure/core-rest-pipeline';
import { object, parse, string, type InferOutput } from 'valibot';

const envSchema = object({
  SPEECH_SERVICES_REGION: string(),
  SPEECH_SERVICES_SUBSCRIPTION_KEY: string()
});

const speechServicesIssueTokenResponse = object({
  token: string()
});

export default async function issueSpeechServicesAccessToken(): Promise<InferOutput<typeof speechServicesIssueTokenResponse>> {
  const { SPEECH_SERVICES_REGION, SPEECH_SERVICES_SUBSCRIPTION_KEY } = parse(envSchema, process.env);

  const client = new ServiceClient({ endpoint: `https://${SPEECH_SERVICES_REGION}.api.cognitive.microsoft.com/` });

  // https://github.com/MicrosoftDocs/azure-docs/blob/main/articles/ai-services/speech-service/includes/cognitive-services-speech-service-rest-auth.md
  const response = await client.sendRequest({
    headers: createHttpHeaders({ authorization: `Bearer ${SPEECH_SERVICES_SUBSCRIPTION_KEY}` }),
    method: 'POST',
    requestId: '',
    timeout: 15_000,
    url: 'sts/v1.0/issueToken',
    withCredentials: false
  });

  if (response.status === 200) {
    return parse(speechServicesIssueTokenResponse, JSON.parse(response.bodyAsText || ''));
  }

  throw new Error('Speech Services returned non-200.');
}
