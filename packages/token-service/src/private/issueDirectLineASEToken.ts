import { ServiceClient } from '@azure/core-client';
import { createHttpHeaders } from '@azure/core-rest-pipeline';
import { object, parse, string } from 'valibot';

const envSchema = object({
  BOT_APP_HOSTNAME: string(),
  DIRECT_LINE_SECRET: string()
});

const directLineASEIssueTokenResponse = object({ token: string() });

export default async function issueDirectLineASEToken(): Promise<Readonly<{ token: string }>> {
  const { BOT_APP_HOSTNAME, DIRECT_LINE_SECRET } = parse(envSchema, process.env);

  const client = new ServiceClient();
  const url = new URL('https://dummy/v3/directline/tokens/generate');

  url.hostname = BOT_APP_HOSTNAME;

  const response = await client.sendRequest({
    headers: createHttpHeaders({ authorization: `Bearer ${DIRECT_LINE_SECRET}` }),
    method: 'POST',
    requestId: '',
    timeout: 15_000,
    url: url.toString(),
    withCredentials: false
  });

  if (response.status === 200) {
    return Object.freeze({
      token: parse(directLineASEIssueTokenResponse, JSON.parse(response.bodyAsText || '')).token
    });
  }

  console.error(response.bodyAsText);

  throw new Error(`Direct Line ASE service returned ${response.status}.`);
}
