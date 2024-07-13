import { ServiceClient } from '@azure/core-client';
import { createHttpHeaders } from '@azure/core-rest-pipeline';
import { object, parse, string } from 'valibot';

const envSchema = object({
  DIRECT_LINE_SECRET: string()
});

const directLineIssueTokenResponse = string();

export default async function issueDirectLineToken(): Promise<Readonly<{ token: string }>> {
  const { DIRECT_LINE_SECRET } = parse(envSchema, process.env);

  const client = new ServiceClient();

  const response = await client.sendRequest({
    headers: createHttpHeaders({ authorization: `Bearer ${DIRECT_LINE_SECRET}` }),
    method: 'POST',
    requestId: '',
    timeout: 15_000,
    url: 'https://directline.botframework.com/api/tokens/conversation',
    withCredentials: false
  });

  if (response.status === 200) {
    return Object.freeze({ token: parse(directLineIssueTokenResponse, JSON.parse(response.bodyAsText || '')) });
  }

  console.log(response.bodyAsText);

  throw new Error(`Direct Line service returned ${response.status}.`);
}
