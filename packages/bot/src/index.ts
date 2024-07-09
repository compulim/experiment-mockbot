import express from 'express';

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

app.listen(PORT, () => console.log(`Bot listening to port ${PORT}.`));
