import {
  BotAdapter,
  TurnContext,
  type Activity,
  type ConversationReference
} from 'botbuilder';
import { Observable } from 'iter-fest/observable';

import { type LogicHandler } from './LogicHandler.js';
import DeferredObservable from './private/DeferredObservable.js';
import dateNow from './private/incrementalNow.js';
import shareObservable from './private/shareObservable.js';

export const USER_PROFILE = { id: 'user', role: 'user' };
export const BOT_PROFILE = { id: 'bot', name: 'bot', role: 'bot' };

type ConnectionStatusUninitialized = 0;
type ConnectionStatusConnecting = 1;
type ConnectionStatusOnline = 2;

type ServiceActivity = Readonly<
  Omit<Activity, 'timestamp'> & {
    conversation: {
      id: LocalConversationId;
    };
    timestamp: string;
  }
>;

type LocalConversationId = `c_${string}`;

type ChatAdapter = {
  activity$: Observable<ServiceActivity>;
  connectionStatus$: Observable<number>;
  end(): void;
  getSessionId(): Observable<never>;
  postActivity(activity: Activity): Observable<string>;
};

/**
 * Custom BotAdapter used for deploying a bot in a browser.
 */
export default class WebChatAdapter extends BotAdapter {
  #activityDeferred: DeferredObservable<ServiceActivity>;
  #connectionStatusDeferred: DeferredObservable<number>;

  #botConnection: ChatAdapter;
  #conversationId: LocalConversationId;
  #logic: LogicHandler;
  #userId: string;

  constructor() {
    super();

    this.#conversationId = `c_${crypto.randomUUID()}`;
    this.#logic = () => Promise.resolve();
    this.#userId = `dl_${crypto.randomUUID()}`;

    this.#connectionStatusDeferred = new DeferredObservable<number>();

    this.#activityDeferred = new DeferredObservable(() => {
      this.#connectionStatusDeferred.next(0 satisfies ConnectionStatusUninitialized);
      this.#connectionStatusDeferred.next(1 satisfies ConnectionStatusConnecting);
      this.#connectionStatusDeferred.next(2 satisfies ConnectionStatusOnline);

      setTimeout(() => {
        this.onReceive(
          Object.freeze({
            membersAdded: [Object.freeze({ id: this.#userId, name: 'User', role: 'user' })],
            type: 'conversationUpdate'
          })
        );
      }, 100);
    });

    this.#botConnection = {
      activity$: shareObservable(this.#activityDeferred.observable),
      connectionStatus$: shareObservable(this.#connectionStatusDeferred.observable),
      end() {},
      getSessionId() {
        return new Observable(observer => observer.error(new Error('Not supported.')));
      },
      postActivity: (activity: Activity) => {
        const now = dateNow();
        const timestamp = new Date(now).toISOString();
        const id = `a_${crypto.randomUUID()}`;

        return new Observable<string>(observer => {
          const serviceActivity: ServiceActivity = {
            ...activity,
            id,
            conversation: {
              conversationType: 'offline',
              id: this.#conversationId,
              name: this.#conversationId,
              isGroup: false
            },
            channelId: 'webchat',
            recipient: BOT_PROFILE,
            timestamp
          };

          (async () => {
            await this.onReceive(serviceActivity);

            observer.next(id);
            observer.complete();

            this.#activityDeferred.next(serviceActivity);
          })();
        });
      }
    };
  }

  get botConnection(): ChatAdapter {
    return this.#botConnection;
  }

  async continueConversation(reference: Partial<ConversationReference>, logic: LogicHandler): Promise<void> {
    const activity = TurnContext.applyConversationReference(
      { type: 'event', name: 'continueConversation' },
      reference,
      true
    );

    const context = new TurnContext(this, activity);

    await this.runMiddleware(context, logic);
  }

  override async deleteActivity(): Promise<never> {
    throw new Error('Not supported.');
  }

  override async updateActivity(): Promise<never> {
    throw new Error('Not supported.');
  }

  /**
   * This WebChatAdapter implements the sendActivities method which is called by the TurnContext class.
   * It's also possible to write a custom TurnContext with different methods of accessing an adapter.
   * @param {TurnContext} context
   * @param {Activity[]} activities
   */
  async sendActivities(_: TurnContext, activities: Activity[]) {
    const activityData = {
      channelId: 'webchat',
      conversation: { id: 'bot' },
      from: BOT_PROFILE,
      recipient: USER_PROFILE
    };

    const sentActivities = activities.map(activity => {
      const now = dateNow();

      return {
        ...activity,
        ...activityData,
        id: now + Math.random().toString(36),
        timestamp: new Date(now).toISOString()
      };
    });

    return sentActivities.map(activity => {
      const { id } = activity;

      this.#activityDeferred.next({
        ...activity,
        conversation: {
          conversationType: 'offline',
          id: this.#conversationId,
          isGroup: false,
          name: activity.conversation.id
        },
        from: {
          id: activity.from.id,
          name: activity.from.id
        },
        recipient: {
          id: activity.recipient.id,
          name: activity.recipient.id
        }
      });

      return { id };
    });
  }

  /**
   * Registers the business logic for the adapter, it takes a handler that takes a TurnContext object as a parameter.
   * @param {function} logic The driver code of the developer's bot application. This code receives and responds to user messages.
   */
  processActivity(logic: LogicHandler) {
    this.#logic = logic;

    return this;
  }

  /**
   * Runs the bot's middleware pipeline in addition to any business logic, if `this.logic` is found.
   * @param {Activity} activity
   */
  onReceive(activity: Readonly<Partial<ServiceActivity>>) {
    const context = new TurnContext(this, {
      callerId: '',
      channelId: 'offline',
      conversation: Object.freeze({
        id: this.#conversationId,
        isGroup: false,
        conversationType: '',
        name: ''
      }),
      // @ts-expect-error okay to be overriden
      from: { id: this.#userId },
      id: `a_${crypto.randomUUID()}`,
      label: '',
      listenFor: [],
      localTimezone: new Date().toISOString(),
      recipient: { id: 'bot', name: '' },
      serviceUrl: '',
      text: '',
      type: '',
      valueType: '',
      ...activity,
      timestamp: activity.timestamp ? new Date(activity.timestamp) : new Date()
    });

    // Runs the middleware pipeline followed by any registered business logic.
    return this.runMiddleware(context, this.#logic || (() => {}));
  }
}
