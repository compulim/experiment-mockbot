import express, { json } from 'express';

declare global {
  var BUILD_TIME: string;
}

const {
  env: { PORT = 8000 }
} = process;

const app = express();

app.use(json());

app.get('/health.txt', (_, res) => {
  res.setHeader('content-type', 'text/plain').send(`ok\n\n${BUILD_TIME}`);
});

app.listen(PORT, () => console.log(`Token service listening to port ${PORT}.`));
