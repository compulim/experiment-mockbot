import {
  BotAdapter,
  TurnContext,
  type Activity,
  type ActivityHandler,
  type ConversationAccount,
  type ConversationReference,
  type ResourceResponse
} from 'botbuilder';
import express from 'express';
import { asyncIteratorToAsyncIterable } from 'iter-fest';
import { type IncomingHttpHeaders } from 'node:http';
import { parse } from 'valibot';
import ClientTurn from './ClientTurn.js';
import executeTurnRequestBodySchema from './executeTurnRequestBody.js';
import handleError from './private/handleError.js';
import isAcceptEventStream from './private/isAcceptEventStream.js';

export type BotMiddleware = Parameters<BotAdapter['runMiddleware']>[1];

export type DirectToEngineBotAdapterInit = {
  bot: ActivityHandler;
};

type Request = { body?: any; headers: IncomingHttpHeaders; params?: any };
type Response = {
  end: () => void;
  socket?: { setNoDelay: (noDelay?: boolean | undefined) => void } | null;
  setHeader: (name: string, value: string | number | readonly string[]) => void;
  write: (chunk: any) => void;
  status: (code: number) => void;
};

function createConversationAccount(conversationId: string): ConversationAccount {
  return {
    id: conversationId,
    isGroup: false,
    conversationType: 'direct-to-engine',
    name: conversationId
  };
}

export default class DirectToEngineBotAdapter extends BotAdapter {
  constructor({ bot }: DirectToEngineBotAdapterInit) {
    super();

    this.#botMiddleware = bot.run.bind(bot);
  }

  #activeSession: Map<string, ClientTurn> = new Map();
  #botMiddleware: BotMiddleware;
  #currentActivityIdNumber: number = 0;
  #currentConversationIdNumber: number = 0;

  #nextActivityId(): string {
    return `a-${++this.#currentActivityIdNumber}`;
  }

  #nextConversationId(): string {
    return `c-${++this.#currentConversationIdNumber}`;
  }

  async #handleContinueTurn(req: Request, res: Response): Promise<void> {
    // TODO: Support { emitStartConversationEvent: true/false }.

    const {
      params: { conversationId }
    } = req;

    res.socket?.setNoDelay(true);
    res.setHeader('access-control-expose-headers', 'x-ms-conversationid');
    res.setHeader('x-ms-conversationid', conversationId);

    const turn = this.#activeSession.get(conversationId);

    if (!turn) {
      throw new Error('Turn not found.');
    }

    if (isAcceptEventStream(req.headers.accept)) {
      res.setHeader('content-type', 'text/event-stream');

      for await (const activities of asyncIteratorToAsyncIterable(turn)) {
        if (!activities.length) {
          break;
        }

        for (const activity of activities) {
          res.write(`event: activity\ndata: ${JSON.stringify(activity)}\n\n`);
        }
      }

      res.write('event: end\ndata: end\n\n');
      res.end();
    } else {
      res.setHeader('content-type', 'application/json');

      const { value } = await turn.next();

      res.write(JSON.stringify({ activities: value, action: value.length ? 'continue' : 'waiting', conversationId }));
      res.end();
    }
  }

  async #handleExecuteTurn(req: Request, res: Response): Promise<void> {
    const {
      params: { conversationId }
    } = req;

    res.socket?.setNoDelay(true);

    const { activity } = parse(executeTurnRequestBodySchema, req.body);

    const turn = this.#run(conversationId, activity);

    if (isAcceptEventStream(req.headers.accept)) {
      res.setHeader('content-type', 'text/event-stream');

      for await (const activities of asyncIteratorToAsyncIterable(turn)) {
        if (!activities.length) {
          break;
        }

        for (const activity of activities) {
          res.write(`event: activity\ndata: ${JSON.stringify(activity)}\n\n`);
        }
      }

      res.write('event: end\ndata: end\n\n');
      res.end();
    } else {
      res.setHeader('content-type', 'application/json');

      const { value } = await turn.next();

      res.write(JSON.stringify({ activities: value, action: value.length ? 'continue' : 'waiting', conversationId }));
      res.end();
    }
  }

  async #handleStartConversation(req: Request, res: Response): Promise<void> {
    // TODO: Support { emitStartConversationEvent: true/false }.

    const conversationId = this.#nextConversationId();

    this.#activeSession.set(conversationId, new ClientTurn());

    res.socket?.setNoDelay(true);
    res.setHeader('access-control-expose-headers', 'x-ms-conversationid');
    res.setHeader('x-ms-conversationid', conversationId);

    const turn = this.#run(conversationId, {
      membersAdded: [{ id: 'user', name: 'User', role: 'user' }],
      type: 'conversationUpdate'
    });

    if (isAcceptEventStream(req.headers.accept)) {
      res.setHeader('content-type', 'text/event-stream');

      for await (const activities of asyncIteratorToAsyncIterable(turn)) {
        if (!activities.length) {
          break;
        }

        for (const activity of activities) {
          res.write(`event: activity\ndata: ${JSON.stringify(activity)}\n\n`);
        }
      }

      res.write('event: end\ndata: end\n\n');
      res.end();
    } else {
      res.setHeader('content-type', 'application/json');

      const { value } = await turn.next();

      res.write(JSON.stringify({ activities: value, action: value.length ? 'continue' : 'waiting', conversationId }));
      res.end();
    }
  }

  #run(conversationId: string, activity: Partial<Activity>): ClientTurn {
    activity = {
      ...activity,
      channelId: 'direct-to-engine',
      conversation: createConversationAccount(conversationId),
      from: { id: 'user', name: 'User', role: 'user' },
      id: this.#nextActivityId(),
      recipient: { id: 'bot', name: 'Bot', role: 'bot' },
      timestamp: new Date()
    };

    const context = new TurnContext(this, activity);
    const turn = this.#activeSession.get(conversationId);

    if (!turn) {
      throw new Error('Turn not found.');
    } else if (turn.whoseTurn !== 'user') {
      throw new Error("Not user's turn.");
    }

    turn.markAsBotTurn(activity);

    (async () => {
      await this.runMiddleware(context, this.#botMiddleware);

      if (!turn.willContinue) {
        turn.markAsUserTurn();
      }
    })();

    return turn;
  }

  override async continueConversation(
    { conversation }: Partial<ConversationReference>,
    logic: (revocableContext: TurnContext) => Promise<void>
  ): Promise<void> {
    if (!conversation) {
      throw new Error('Invalid ConversationReference.');
    } else if (typeof logic === 'string') {
      throw new Error('Not supported.');
    }

    const { id: conversationId } = conversation;
    const turn = this.#activeSession.get(conversationId);

    if (!turn) {
      throw new Error('Adapter.willContinue() must be called before a conversation can be continued.');
    } else if (!turn.currentActivity) {
      throw new Error('Cannot continue turn without activity.');
    }

    await logic(new TurnContext(this, turn.currentActivity));

    turn.markAsUserTurn();
  }

  override continueConversationAsync(
    _claimsIdentity: unknown,
    reference: Partial<ConversationReference>,
    audience: unknown,
    logic?: unknown
  ): Promise<void> {
    if (typeof audience !== 'string') {
      return this.continueConversation(reference, audience as (context: TurnContext) => Promise<void>);
    } else {
      return this.continueConversation(reference, logic as (context: TurnContext) => Promise<void>);
    }
  }

  createExpressRouter(): express.Router {
    const router = express.Router();

    router.use(express.json());
    router.post(
      '/environments/:environmentId/bots/:botId/test/conversations',
      handleError(this.#handleStartConversation.bind(this))
    );
    router.post(
      '/environments/:environmentId/bots/:botId/test/conversations/:conversationId',
      handleError(this.#handleExecuteTurn.bind(this))
    );
    router.post(
      '/environments/:environmentId/bots/:botId/test/conversations/:conversationId/continue',
      handleError(this.#handleContinueTurn.bind(this))
    );

    return router;
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
      throw new Error('Proactive sessions must call "willContinue" before "continueConversation".');
    }

    const filledActivities = activities.map(activity => ({
      ...activity,
      conversation: createConversationAccount(conversationId),
      id: this.#nextActivityId(),
      timestamp: new Date()
    }));

    session.push(...(filledActivities as Activity[]));

    return Promise.resolve(filledActivities.map(({ id }) => ({ id })));
  }

  override updateActivity(): Promise<void | ResourceResponse> {
    throw new Error('Not supported.');
  }

  willContinue(context: TurnContext) {
    const turn = this.#activeSession.get(context.activity.conversation.id);

    if (!turn) {
      throw new Error('Cannot mark a non-existent context to continue.');
    }

    turn.markAsWillContinue();
  }
}
