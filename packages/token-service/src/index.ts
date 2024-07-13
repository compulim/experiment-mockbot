import express, { json, type RequestHandler } from 'express';
import issueDirectLineToken from './private/issueDirectLineToken';
import issueSpeechServicesAccessToken from './private/issueSpeechServicesAccessToken';
import issueSpeechServicesAccessToken2 from './private/issueSpeechServicesAccessToken2';
import issueSpeechServicesAccessToken3 from './private/issueSpeechServicesAccessToken3';

declare global {
  var BUILD_TIME: string;
}

const {
  env: { PORT = 8000 }
} = process;

function handleError<P, ResBody, ReqBody, ReqQuery, Locals extends Record<string, any> = Record<string, any>>(
  fn: RequestHandler<P, ResBody, ReqBody, ReqQuery, Locals>
): RequestHandler<P, ResBody, ReqBody, ReqQuery, Locals> {
  return async (req, res, next) => {
    try {
      return await fn(req, res, next);
    } catch (error) {
      console.error(error);

      next(error);
    }
  };
}

const app = express();

app.use(json());

app.get('/health.txt', (_, res) => {
  res.setHeader('content-type', 'text/plain').send(`ok\n\n${BUILD_TIME}`);
});

app.get(
  '/api/token/directline',
  handleError(async (_, res) => res.json({ token: (await issueDirectLineToken()).token }))
);

app.get(
  '/api/token/speech/1',
  handleError(async (_, res) => res.json({ token: (await issueSpeechServicesAccessToken()).token }))
);

app.get(
  '/api/token/speech/2',
  handleError(async (_, res) =>
    res.json({ token: (await issueSpeechServicesAccessToken({ useManagedIdentity: true })).token })
  )
);

app.get(
  '/api/token/speech/3',
  handleError(async (_, res) => res.json({ token: (await issueSpeechServicesAccessToken2()).token }))
);

app.get(
  '/api/token/speech/4',
  handleError(async (_, res) => res.json({ token: (await issueSpeechServicesAccessToken3()).token }))
);

app.listen(PORT, () => console.log(`Token service listening to port ${PORT}.`));
