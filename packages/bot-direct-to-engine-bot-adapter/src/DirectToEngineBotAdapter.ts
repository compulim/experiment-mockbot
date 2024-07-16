import {
  BotAdapter,
  TurnContext,
  type Activity,
  type ActivityHandler,
  type ConversationAccount,
  type ConversationReference,
  type ResourceResponse
} from 'botbuilder';
import { parse as parseContentType } from 'content-type';
import express from 'express';
import { type IncomingHttpHeaders } from 'node:http';
import createDeferred, { type DeferredPromise } from 'p-defer';
import { parse } from 'valibot';
import executeTurnRequestBodySchema from './executeTurnRequestBody.js';

export type BotMiddleware = Parameters<BotAdapter['runMiddleware']>[1];

export type DirectToEngineBotAdapterInit = {
  bot: ActivityHandler;
};

type HalfDuplexSession = {
  initialActivity: Partial<Activity>;
  ongoing: DeferredPromise<void> | undefined;
  send: (...activities: Partial<Activity>[]) => Promise<void>;
};

function createConversationAccount(conversationId: string): ConversationAccount {
  return {
    id: conversationId,
    isGroup: false,
    conversationType: 'direct-to-engine',
    name: conversationId
  };
}

function shouldAcceptEventSteam(accept: string = '') {
  return !!accept
    .split(',')
    .map(parseContentType)
    .find(({ type }) => type === 'text/event-stream');
}

export default class DirectToEngineBotAdapter extends BotAdapter {
  constructor({ bot }: DirectToEngineBotAdapterInit) {
    super();

    this.#botMiddleware = bot.run.bind(bot);
  }

  #activeSession: Map<string, HalfDuplexSession> = new Map();
  #botMiddleware: BotMiddleware;
  #currentActivityIdNumber: number = 0;
  #currentConversationIdNumber: number = 0;

  #nextActivityId(): string {
    return `a-${++this.#currentActivityIdNumber}`;
  }

  #nextConversationId(): string {
    return `c-${++this.#currentConversationIdNumber}`;
  }

  async #handleStartConversation(
    req: { headers: IncomingHttpHeaders },
    res: {
      end: () => void;
      setHeader: (name: string, value: string | number | readonly string[]) => void;
      write: (chunk: any) => void;
      status: (code: number) => void;
    }
  ): Promise<void> {
    if (!shouldAcceptEventSteam(req.headers.accept)) {
      res.status(400);
      res.write('Must set Accept: text/event-stream.');

      return res.end();
    }

    const conversationId = this.#nextConversationId();
    let context: TurnContext | undefined;

    try {
      res.setHeader('content-type', 'text/event-stream');
      res.setHeader('x-ms-conversationid', conversationId);

      await this.#run(
        conversationId,
        {
          membersAdded: [{ id: 'user', name: 'User', role: 'user' }],
          type: 'conversationUpdate'
        },
        async (...activities) => {
          for (const activity of activities) {
            res.write(`event: activity\ndata: ${JSON.stringify(activity)}\n\n`);
          }
        }
      );

      res.write('event: end\ndata: end\n\n');
      res.end();
    } catch (error) {
      console.error(error);
      context && this.onTurnError(context, error instanceof Error ? error : new Error(error + ''));

      res.status(500);
    }
  }

  async #handleExecuteTurn(
    req: { body?: any; headers: IncomingHttpHeaders; params?: any },
    res: {
      end: () => void;
      socket?: { setNoDelay: (noDelay?: boolean | undefined) => void } | null;
      setHeader: (name: string, value: string | number | readonly string[]) => void;
      write: (chunk: any) => void;
      status: (code: number) => void;
    }
  ): Promise<void> {
    if (!shouldAcceptEventSteam(req.headers.accept)) {
      res.status(400);
      res.write('Must set Accept: text/event-stream.');

      return res.end();
    }

    res.socket?.setNoDelay(true);

    const {
      params: { conversationId }
    } = req;

    let context: TurnContext | undefined;

    try {
      const { activity } = parse(executeTurnRequestBodySchema, req.body);

      res.setHeader('content-type', 'text/event-stream');

      await this.#run(conversationId, activity, async (...activities) => {
        for (const activity of activities) {
          res.write(`event: activity\ndata: ${JSON.stringify(activity)}\n\n`);
        }
      });

      res.write('event: end\ndata: end\n\n');
      res.end();
    } catch (error) {
      console.error(error);
      context && this.onTurnError(context, error instanceof Error ? error : new Error(error + ''));

      res.status(500);
    }
  }

  createExpressRouter(): express.Router {
    const router = express.Router();

    router.use(express.json());
    router.post(
      '/environments/:environmentId/bots/:botId/test/conversations',
      this.#handleStartConversation.bind(this)
    );
    router.post(
      '/environments/:environmentId/bots/:botId/test/conversations/:conversationId',
      this.#handleExecuteTurn.bind(this)
    );

    return router;
  }

  async #run(
    conversationId: string,
    initialActivity: Partial<Activity>,
    send: (...activities: Partial<Activity>[]) => Promise<void>
  ): Promise<void> {
    initialActivity = {
      ...initialActivity,
      channelId: 'direct-to-engine',
      conversation: createConversationAccount(conversationId),
      from: { id: 'user', name: 'User', role: 'user' },
      id: this.#nextActivityId(),
      recipient: { id: 'bot', name: 'Bot', role: 'bot' },
      timestamp: new Date()
    };

    const context = new TurnContext(this, initialActivity);

    const session: HalfDuplexSession = { initialActivity, ongoing: undefined, send };

    this.#activeSession.set(conversationId, session);

    await this.runMiddleware(context, this.#botMiddleware);
    await session.ongoing?.promise;

    this.#activeSession.delete(conversationId);
  }

  override async continueConversation(
    { conversation }: Partial<ConversationReference>,
    logic: (revocableContext: TurnContext) => Promise<void>
  ): Promise<void> {
    if (!conversation) {
      throw new Error('Invalid ConversationReference.');
    }

    const { id: conversationId } = conversation;
    const session = this.#activeSession.get(conversationId);

    if (!session) {
      throw new Error('Adapter.willContinue() must be called before a conversation can be continued.');
    }

    await logic(new TurnContext(this, session.initialActivity));

    session.ongoing?.resolve();
  }

  override deleteActivity(): Promise<void> {
    throw new Error('Not supported.');
  }

  override sendActivities(context: TurnContext, activities: Partial<Activity>[]): Promise<ResourceResponse[]> {
    const {
      activity: {
        conversation: { id: conversationId }
      }
    } = context;

    const session = this.#activeSession.get(conversationId);

    if (!session) {
      throw new Error('Proactive send activities is not supported.');
    }

    const filledActivities = activities.map(activity => ({
      ...activity,
      conversation: createConversationAccount(conversationId),
      id: this.#nextActivityId(),
      timestamp: new Date()
    }));

    session.send(...filledActivities);

    return Promise.resolve(filledActivities.map(({ id }) => ({ id })));
  }

  override updateActivity(): Promise<void | ResourceResponse> {
    throw new Error('Not supported.');
  }

  willContinue(context: TurnContext) {
    const currentSession = this.#activeSession.get(context.activity.conversation.id);

    if (!currentSession) {
      throw new Error('Cannot mark a non-existent context to continue.');
    }

    currentSession.ongoing = createDeferred();
  }
}
