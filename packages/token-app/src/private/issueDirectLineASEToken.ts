import { ServiceClient } from '@azure/core-client';
import { createHttpHeaders } from '@azure/core-rest-pipeline';
import { ManagedIdentityCredential } from '@azure/identity';
import { object, parse, string } from 'valibot';

const envSchema = object({
  ECHO_BOT_APP_HOST_NAME: string(),
  ECHO_BOT_AZURE_CLIENT_ID: string(),
  ECHO_BOT_DIRECT_LINE_SECRET: string(),
  MOCK_BOT_APP_HOST_NAME: string(),
  MOCK_BOT_AZURE_CLIENT_ID: string(),
  MOCK_BOT_DIRECT_LINE_SECRET: string(),
  TODO_BOT_APP_HOST_NAME: string(),
  TODO_BOT_AZURE_CLIENT_ID: string(),
  TODO_BOT_DIRECT_LINE_SECRET: string()
});

const directLineASEIssueTokenResponse = object({ token: string() });

export default async function issueDirectLineASEToken(
  init: { bot?: 'echo bot' | 'mock bot' | 'todo bot' | undefined; useManagedIdentity?: boolean | undefined } = {}
): Promise<Readonly<{ domain: string; token: string }>> {
  const {
    ECHO_BOT_APP_HOST_NAME,
    ECHO_BOT_AZURE_CLIENT_ID,
    ECHO_BOT_DIRECT_LINE_SECRET,
    MOCK_BOT_APP_HOST_NAME,
    MOCK_BOT_AZURE_CLIENT_ID,
    MOCK_BOT_DIRECT_LINE_SECRET,
    TODO_BOT_APP_HOST_NAME,
    TODO_BOT_AZURE_CLIENT_ID,
    TODO_BOT_DIRECT_LINE_SECRET
  } = parse(envSchema, process.env);

  const client = new ServiceClient();
  const url = new URL('https://dummy/.bot/v3/directline/tokens/generate');

  url.hostname =
    init.bot === 'echo bot'
      ? ECHO_BOT_APP_HOST_NAME
      : init.bot === 'todo bot'
      ? TODO_BOT_APP_HOST_NAME
      : MOCK_BOT_APP_HOST_NAME;

  const headers = createHttpHeaders({ 'content-type': 'application/json' });

  if (init.useManagedIdentity) {
    const tokenCredential = new ManagedIdentityCredential({
      clientId:
        init.bot === 'echo bot'
          ? ECHO_BOT_AZURE_CLIENT_ID
          : init.bot === 'todo bot'
          ? TODO_BOT_AZURE_CLIENT_ID
          : MOCK_BOT_AZURE_CLIENT_ID
    });

    const accessToken = await tokenCredential.getToken('https://directlineextension.botframework.com/');

    // console.log('managed identity token\n\n', accessToken);

    headers.set('authorization', `Bearer ${accessToken}`);
  } else {
    headers.set(
      'authorization',
      `Bearer ${
        init.bot === 'echo bot'
          ? ECHO_BOT_DIRECT_LINE_SECRET
          : init.bot === 'todo bot'
          ? TODO_BOT_DIRECT_LINE_SECRET
          : MOCK_BOT_DIRECT_LINE_SECRET
      }`
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

  throw new Error(
    `Direct Line ASE service returned ${response.status} while fetching token for "${init.bot}"${
      init.useManagedIdentity
        ? ` with MSI ${
            init.bot === 'echo bot'
              ? ECHO_BOT_AZURE_CLIENT_ID
              : init.bot === 'todo bot'
              ? TODO_BOT_AZURE_CLIENT_ID
              : MOCK_BOT_AZURE_CLIENT_ID
          }`
        : ' with secret'
    }.`
  );
}
