import 'dotenv/config';

import { DirectToEngineBotAdapter } from '@microsoft/botframework-mockbot-bot-direct-to-engine-bot-adapter';
import { type ActivityHandler } from 'botbuilder';
import { AuthenticationConstants } from 'botframework-connector';
import cors from 'cors';
import express, { json } from 'express';
import { createServer } from 'http';
import { platform } from 'node:os';
import { resolve } from 'path';
import { object, optional, parse, string } from 'valibot';
import createBotFrameworkAdapter from './adapter/createBotFrameworkAdapter.js';
import handleError from './private/handleError.js';

const { APPSETTING_WEBSITE_SITE_NAME, MicrosoftAppId, PORT } = parse(
  object({
    APPSETTING_WEBSITE_SITE_NAME: optional(string()),
    MicrosoftAppId: optional(string()),
    PORT: optional(string(), '3978')
  }),
  process.env
);

export function hostBotAsAzureWebApps(bot: ActivityHandler) {
  const app = express();
  const directToEngineAdapter = new DirectToEngineBotAdapter({ bot });

  app.use(cors());
  app.use(json({ limit: '2mb' }));
  app.use(directToEngineAdapter.createExpressRouter());

  app.get('/health.txt', (_, res) => {
    res.setHeader('content-type', 'text/plain').send(`ok\n\n${BUILD_TIME}`);
  });

  const adapter = createBotFrameworkAdapter();

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
  app.post(
    '/api/messages',
    handleError((req, res, _) => {
      adapter.process(req as any, res, async context => {
        // Route to main dialog.
        await bot.run(context);
      });
    })
  );

  app.use('/assets/', express.static(resolve(__dirname, '../public/assets/')));

  const server = createServer(app);

  server.on('upgrade', async (req, socket, head) => {
    // Create an adapter scoped to this WebSocket connection to allow storing session data.
    try {
      const streamingAdapter = createBotFrameworkAdapter();

      await streamingAdapter.process(
        {
          body: {},
          headers: req.headers,
          method: req.method || 'GET'
        },
        socket as any,
        head,
        context => bot.run(context)
      );
    } catch (error) {
      console.error(error);

      socket.end();
    }
  });

  server.listen(PORT, () => console.log(`Bot listening to port ${PORT}.`));
}
