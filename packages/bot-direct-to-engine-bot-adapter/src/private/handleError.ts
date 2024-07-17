import { type RequestHandler } from 'express';

export default function handleError<
  P,
  ResBody,
  ReqBody,
  ReqQuery,
  Locals extends Record<string, any> = Record<string, any>
>(fn: RequestHandler<P, ResBody, ReqBody, ReqQuery, Locals>): RequestHandler<P, ResBody, ReqBody, ReqQuery, Locals> {
  return async (req, res, next) => {
    try {
      return await fn(req, res, next);
    } catch (error) {
      console.error(error);

      next(error);
    }
  };
}
