import express, { json } from 'express';
import issueDirectLineToken from './private/issueDirectLineToken';
import issueSpeechServicesAccessToken from './private/issueSpeechServicesAccessToken';

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

app.get('/api/token/directline', async (_, res) => res.json((await issueDirectLineToken()).token));
app.get('/api/token/speech', async (_, res) => res.json((await issueSpeechServicesAccessToken()).token));

app.listen(PORT, () => console.log(`Token service listening to port ${PORT}.`));
