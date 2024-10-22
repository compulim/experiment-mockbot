import { ActivityHandler, MessageFactory, TurnContext, type ConversationState, type UserState } from 'botbuilder';
import sleep from './private/sleep.js';

type BotInit = {
  botAppId: string;
  conversationState?: ConversationState;
  userState?: UserState;
};

const CHUNK_INTERVAL = 20;
const TOKENS =
  'Alfa Bravo Charlie Delta Echo Foxtrot Golf Hotel India Juliett Kilo Lima Mike November Oscar Papa Quebec Romeo Sierra Tango Uniform Victor Whiskey Xray Yankee Zulu';

export default class EchoBot extends ActivityHandler {
  constructor({ botAppId, conversationState, userState }: BotInit) {
    super();

    // See https://aka.ms/about-bot-activity-message to learn more about the message and other activity types.
    this.onMessage(async (context, next) => {
      const replyToId = context.activity.id;

      console.log('onMessage', context.activity);

      if (context.activity.text === 'proactive') {
        const conversationReference = TurnContext.getConversationReference(context.activity);

        console.log('proactive', conversationReference);

        conversationReference.activityId = context.activity.id || '';

        const { adapter } = context;

        'willContinue' in adapter && (adapter as { willContinue: (context: TurnContext) => {} }).willContinue(context);

        setTimeout(() => {
          adapter.continueConversationAsync(botAppId, conversationReference, async context => {
            context.activity.id = replyToId || ''; // HACK: `replyToId` is a random UUID.

            await context.sendActivity({
              text: 'Proactive done.',
              type: 'message'
            });
          });
        }, 1000);

        await context.sendActivity('Proactive kicked off.');

        return;
      } else if (context.activity.text === 'livestreaming') {
        const conversationReference = TurnContext.getConversationReference(context.activity);

        console.log('livestreaming', conversationReference);

        conversationReference.activityId = context.activity.id || '';

        const { adapter } = context;

        const firstActivity = await context.sendActivity({
          channelData: {
            streamType: 'streaming'
          },
          text: '...',
          type: 'typing'
        });

        if (!firstActivity) {
          throw new Error('Failed to send first typing activity.');
        }

        // DLASE does not return `activity.id`.
        const { id: streamId } = firstActivity;

        console.log(`streamId: ${streamId}`);

        const livestream = async (context: TurnContext) => {
          let match: RegExpMatchArray | null;
          let pattern = /\s/gu;
          let streamSequence = 0;

          while ((match = pattern.exec(TOKENS))) {
            const text = TOKENS.substring(0, match.index);

            await context.sendActivity({
              channelData: { streamId, streamSequence: ++streamSequence, streamType: 'streaming' },
              text,
              type: 'typing'
            });

            await sleep(CHUNK_INTERVAL);
          }

          await context.sendActivity({
            channelData: { streamId, streamType: 'streaming' },
            text: TOKENS,
            type: 'message'
          });
        };

        if (context.activity.serviceUrl === 'urn:botframework:namedpipe:bfv4.pipes') {
          // DLASE does not support proactive messaging.
          await livestream(context);
        } else {
          (async () => {
            'willContinue' in adapter &&
              (adapter as { willContinue: (context: TurnContext) => {} }).willContinue(context);

            adapter.continueConversationAsync(botAppId, conversationReference, async context => {
              context.activity.id = replyToId || ''; // HACK: `replyToId` is a random UUID.

              await livestream(context);
            });
          })();
        }

        return;
      }

      const replyText = `Echo: ${context.activity.text}`;

      await context.sendActivity(MessageFactory.text(replyText, replyText, 'expectingInput'));
      // By calling next() you ensure that the next BotHandler is run.
      await next();

      await conversationState?.saveChanges(context);
      await userState?.saveChanges(context);
    });

    this.onMembersAdded(async (context, next) => {
      const membersAdded = context.activity.membersAdded || [];
      const welcomeText = 'Hello and welcome!';

      for (const { id } of membersAdded) {
        if (id !== context.activity.recipient.id) {
          await context.sendActivity(MessageFactory.text(welcomeText, welcomeText));
        }
      }

      // By calling next() you ensure that the next BotHandler is run.
      await next();
    });
  }
}
