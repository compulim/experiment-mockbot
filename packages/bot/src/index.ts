import { BotFrameworkAdapter, type WebRequest } from 'botbuilder';
import type { INodeBuffer, INodeSocket } from 'botframework-streaming';
import express, { json } from 'express';
import { createServer } from 'http';
import { platform } from 'node:os';
import { object, optional, parse, string } from 'valibot';
import createBotFrameworkAdapter from './adapter/createBotFrameworkAdapter';
import EchoBot from './bot/EchoBot';

declare global {
  var BUILD_TIME: string;
}

const { APPSETTING_WEBSITE_SITE_NAME, PORT } = parse(
  object({
    APPSETTING_WEBSITE_SITE_NAME: string(),
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

// Listen for incoming requests.
app.post('/api/messages', (req, res, _) => {
  console.log('POST /api/messages', req.body);

  adapter.process(req, res, async context => {
    // Route to main dialog.
    await bot.run(context);
  });
});

const server = createServer(app);

const namedPipeAdapter = new BotFrameworkAdapter({
  appId: 'DUMMY',
  appPassword: 'DUMMY'
});

// Enable Direct Line App Service Extension
// See https://docs.microsoft.com/en-us/azure/bot-service/bot-service-channel-directline-extension-node-bot?view=azure-bot-service-4.0
platform() === 'win32' &&
  namedPipeAdapter.useNamedPipe(context => bot.run(context), `${APPSETTING_WEBSITE_SITE_NAME}.directline`);

server.on('upgrade', (req: WebRequest, socket: INodeSocket, head: INodeBuffer) => {
  console.log('UPGRADE', req.headers);

  namedPipeAdapter.useWebSocket(req, socket, head, context => bot.run(context));
});

server.listen(PORT, () => console.log(`Bot listening to port ${PORT}.`));
