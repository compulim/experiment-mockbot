import cors from 'cors';
import express, { json, type RequestHandler } from 'express';
import { object, optional, parse, string } from 'valibot';
import issueDirectLineASEToken from './private/issueDirectLineASEToken';
import issueDirectLineToken from './private/issueDirectLineToken';
import issueSpeechServicesAccessToken from './private/issueSpeechServicesAccessToken';

declare global {
  var BUILD_TIME: string;
}

const { PORT, SPEECH_SERVICES_REGION, TRUSTED_ORIGINS } = parse(
  object({
    PORT: optional(string()),
    SPEECH_SERVICES_REGION: string(),
    TRUSTED_ORIGINS: optional(string())
  }),
  process.env
);

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

app.use(
  cors({
    origin(requestOrigin, callback) {
      if (
        !TRUSTED_ORIGINS ||
        (requestOrigin &&
          TRUSTED_ORIGINS?.split(',')
            .map(origin => origin.trim())
            .includes(requestOrigin))
      ) {
        return callback(null, true);
      }

      callback(new Error('Not allowed by CORS'));
    }
  })
);
app.use(json());

app.get('/health.txt', (_, res) => {
  res.setHeader('content-type', 'text/plain').send(`ok\n\n${BUILD_TIME}`);
});

app.use(
  '/api/token/directline',
  handleError(async (req, res, next) =>
    req.method === 'GET' || req.method === 'POST' ? res.json({ token: (await issueDirectLineToken()).token }) : next()
  )
);

app.use(
  '/api/token/directline/msi',
  handleError(async (req, res, next) =>
    req.method === 'GET' || req.method === 'POST'
      ? res.json({ token: (await issueDirectLineToken({ useManagedIdentity: true })).token })
      : next()
  )
);

app.use(
  '/api/token/directlinease',
  handleError(async (req, res, next) =>
    req.method === 'GET' || req.method === 'POST'
      ? res.json({ token: (await issueDirectLineASEToken()).token })
      : next()
  )
);

app.use(
  '/api/token/speech/msi',
  handleError(async (req, res, next) =>
    req.method === 'GET' || req.method === 'POST'
      ? res.json({
          region: SPEECH_SERVICES_REGION,
          token: (await issueSpeechServicesAccessToken({ useManagedIdentity: true })).token
        })
      : next()
  )
);

app.use(
  '/api/token/speech',
  handleError(async (req, res, next) =>
    req.method === 'GET' || req.method === 'POST'
      ? res.json({
          region: SPEECH_SERVICES_REGION,
          token: (await issueSpeechServicesAccessToken()).token
        })
      : next()
  )
);

app.listen(PORT, () => console.log(`Token service listening to port ${PORT}.`));
