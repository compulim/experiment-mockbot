import { ServiceClient } from '@azure/core-client';
import { createHttpHeaders } from '@azure/core-rest-pipeline';
import { ManagedIdentityCredential } from '@azure/identity';
import { object, parse, string } from 'valibot';

const envSchema = object({
  AZURE_CLIENT_ID: string(),
  DIRECT_LINE_SECRET: string(),
  MOCKBOT1_APP_HOSTNAME: string()
});

const directLineASEIssueTokenResponse = object({ token: string() });

export default async function issueDirectLineASEToken(
  init: { useManagedIdentity?: boolean | undefined } = {}
): Promise<Readonly<{ domain: string; token: string }>> {
  const { AZURE_CLIENT_ID, MOCKBOT1_APP_HOSTNAME, DIRECT_LINE_SECRET } = parse(envSchema, process.env);

  const client = new ServiceClient();
  const url = new URL('https://dummy/.bot/v3/directline/tokens/generate');

  url.hostname = MOCKBOT1_APP_HOSTNAME;

  const headers = createHttpHeaders({ 'content-type': 'application/json' });

  if (init.useManagedIdentity) {
    const tokenCredential = new ManagedIdentityCredential({ clientId: AZURE_CLIENT_ID });

    const accessToken = await tokenCredential.getToken('https://directlineextension.botframework.com/');

    // console.log('managed identity token\n\n', accessToken);

    headers.set('authorization', `Bearer ${accessToken}`);
  } else {
    headers.set('authorization', `Bearer ${DIRECT_LINE_SECRET}`);
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
    url: url.toString(),
    withCredentials: false
  });

  if (response.status === 200) {
    return Object.freeze({
      domain: new URL('/.bot/v3/directline', url).href,
      token: parse(directLineASEIssueTokenResponse, JSON.parse(response.bodyAsText || '')).token
    });
  }

  console.error(response.bodyAsText);

  throw new Error(`Direct Line ASE service returned ${response.status}.`);
}
