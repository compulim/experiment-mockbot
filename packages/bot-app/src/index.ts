// @ts-expect-error we will turn everything into CJS
import { EchoBot } from '@microsoft/botframework-mockbot-bot-logic';
import { AuthenticationConstants } from 'botframework-connector';
import express, { json } from 'express';
import { createServer } from 'http';
import { platform } from 'node:os';
import { object, optional, parse, string } from 'valibot';
import createBotFrameworkAdapter from './adapter/createBotFrameworkAdapter.js';

declare global {
  var BUILD_TIME: string;
}

const { APPSETTING_WEBSITE_SITE_NAME, MicrosoftAppId, PORT } = parse(
  object({
    APPSETTING_WEBSITE_SITE_NAME: optional(string()),
    MicrosoftAppId: optional(string()),
    PORT: optional(string(), '3978')
  }),
  process.env
);

const app = express();

app.use(json());

app.get('/health.txt', (_, res) => {
  res.setHeader('content-type', 'text/plain').send(`ok\n\n${BUILD_TIME}`);
});

const adapter = createBotFrameworkAdapter();
const bot = new EchoBot();

// Enable Direct Line App Service Extension
// See https://docs.microsoft.com/en-us/azure/bot-service/bot-service-channel-directline-extension-node-bot?view=azure-bot-service-4.0
APPSETTING_WEBSITE_SITE_NAME &&
  MicrosoftAppId &&
  platform() === 'win32' &&
  adapter.connectNamedPipe(
    `${APPSETTING_WEBSITE_SITE_NAME}.directline`,
    context => bot.run(context),
    MicrosoftAppId,
    AuthenticationConstants.ToChannelFromBotOAuthScope
  );

// Listen for incoming requests.
app.post('/api/messages', (req, res, _) => {
  console.log('POST /api/messages', req.body);

  adapter.process(req, res, async context => {
    // Route to main dialog.
    await bot.run(context);
  });
});

const server = createServer(app);

// server.on('upgrade', (req, socket, head) => {
//   // TODO: Fix the incompatibility between NodeJS.Duplex and INodeSocket.
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   adapter.useWebSocket(req, socket as any, head, async context => {
//     // After connecting via WebSocket, run this logic for every request sent over
//     // the WebSocket connection.
//     await bot.run(context);
//   });
// });

server.on('upgrade', async (req, socket, head) => {
  // Create an adapter scoped to this WebSocket connection to allow storing session data.
  const streamingAdapter = createBotFrameworkAdapter();

  await streamingAdapter.process(
    {
      body: head,
      headers: req.headers,
      method: req.method || 'GET'
    },
    socket as any,
    head,
    context => bot.run(context)
  );
});

server.listen(PORT, () => console.log(`Bot listening to port ${PORT}.`));
