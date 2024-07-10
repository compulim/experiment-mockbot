import express from 'express';
import createBotFrameworkAdapter from './adapter/createBotFrameworkAdapter';
import EchoBot from './bot/EchoBot';

declare global {
  var BUILD_TIME: string;
}

const {
  env: { PORT = 3978 }
} = process;

const app = express();

app.get('/health.txt', (_, res) => {
  res.setHeader('content-type', 'text/plain').send(`ok\n\n${BUILD_TIME}`);
});

const adapter = createBotFrameworkAdapter();
const bot = new EchoBot();

// Listen for incoming requests.
app.post('/api/messages', (req, res, _) =>
  adapter.process(req, res, async context => {
    // Route to main dialog.
    await bot.run(context);
  })
);

app.listen(PORT, () => console.log(`Bot listening to port ${PORT}.`));
