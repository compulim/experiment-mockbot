import { ServiceClient } from '@azure/core-client';
import { createHttpHeaders } from '@azure/core-rest-pipeline';
import { ManagedIdentityCredential } from '@azure/identity';
import { object, parse, string } from 'valibot';

const envSchema = object({
  ECHO_BOT_AZURE_CLIENT_ID: string(),
  ECHO_BOT_DIRECT_LINE_SECRET: string(),
  MOCK_BOT_AZURE_CLIENT_ID: string(),
  MOCK_BOT_DIRECT_LINE_SECRET: string()
});

const directLineIssueTokenResponse = string();

export default async function issueDirectLineToken(
  init: { bot?: 'echo bot' | 'mock bot' | undefined; useManagedIdentity?: boolean | undefined } = {}
): Promise<Readonly<{ token: string }>> {
  const {
    ECHO_BOT_AZURE_CLIENT_ID,
    ECHO_BOT_DIRECT_LINE_SECRET,
    MOCK_BOT_AZURE_CLIENT_ID,
    MOCK_BOT_DIRECT_LINE_SECRET
  } = parse(envSchema, process.env);

  const client = new ServiceClient();
  const headers = createHttpHeaders({ 'content-type': 'application/json' });

  if (init.useManagedIdentity) {
    const tokenCredential = new ManagedIdentityCredential({
      clientId: init.bot === 'echo bot' ? ECHO_BOT_AZURE_CLIENT_ID : MOCK_BOT_AZURE_CLIENT_ID
    });

    const accessToken = await tokenCredential.getToken('https://directline.botframework.com/');

    // console.log('managed identity token\n\n', accessToken);

    headers.set('authorization', `Bearer ${accessToken}`);
  } else {
    headers.set(
      'authorization',
      `Bearer ${init.bot === 'echo bot' ? ECHO_BOT_DIRECT_LINE_SECRET : MOCK_BOT_DIRECT_LINE_SECRET}`
    );
  }

  // TODO: This should use Managed Identity instead of Direct Line secret.
  const response = await client.sendRequest({
    body: JSON.stringify({
      User: { Id: `dl_${crypto.randomUUID()}` }
    }),
    headers,
    method: 'POST',
    requestId: '',
    timeout: 15_000,
    url: 'https://directline.botframework.com/api/tokens/conversation',
    withCredentials: false
  });

  if (response.status === 200) {
    return Object.freeze({ token: parse(directLineIssueTokenResponse, JSON.parse(response.bodyAsText || '')) });
  }

  console.error(response.bodyAsText);

  throw new Error(`Direct Line service returned ${response.status}.`);
}
