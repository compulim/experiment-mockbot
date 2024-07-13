import { ServiceClient } from '@azure/core-client';
import { createHttpHeaders } from '@azure/core-rest-pipeline';
import { object, parse, string, type InferOutput } from 'valibot';

const envSchema = object({
  DIRECT_LINE_SECRET: string()
});

const directLineIssueTokenResponse = object({
  token: string()
});

export default async function issueDirectLineToken(): Promise<InferOutput<typeof directLineIssueTokenResponse>> {
  const { DIRECT_LINE_SECRET } = parse(envSchema, process.env);

  const client = new ServiceClient({ endpoint: 'https://directline.botframework.com/' });

  const response = await client.sendRequest({
    headers: createHttpHeaders({ authorization: `Bearer ${DIRECT_LINE_SECRET}` }),
    method: 'POST',
    requestId: '',
    timeout: 15_000,
    url: 'api/tokens/conversation',
    withCredentials: false
  });

  if (response.status === 200) {
    return parse(directLineIssueTokenResponse, JSON.parse(response.bodyAsText || ''));
  }

  throw new Error('Direct Line service returned non-200.');
}
