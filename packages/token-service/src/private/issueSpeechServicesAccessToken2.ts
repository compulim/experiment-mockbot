import { ServiceClient } from '@azure/core-client';
import { createHttpHeaders } from '@azure/core-rest-pipeline';
import { DefaultAzureCredential } from '@azure/identity';
import { object, parse, string } from 'valibot';

const envSchema = object({
  SPEECH_SERVICES_REGION: string()
});

// const speechServicesIssueTokenResponse = object({
//   token: string()
// });

export default async function issueSpeechServicesAccessToken2(): Promise<Readonly<{ token: string }>> {
  const { SPEECH_SERVICES_REGION } = parse(envSchema, process.env);
  // https://github.com/MicrosoftDocs/azure-docs/blob/main/articles/ai-services/speech-service/includes/cognitive-services-speech-service-rest-auth.md
  const credential = new DefaultAzureCredential();

  const accessToken = await credential.getToken([]);

  console.log(accessToken.token);

  const client = new ServiceClient({ credential });

  const response = await client.sendRequest({
    headers: createHttpHeaders(),
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
