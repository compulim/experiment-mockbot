import { TurnContext } from 'botbuilder';
import type { BotInit } from '../index.js';
import sleep from '../private/sleep.js';

const CHUNK_INTERVAL = 5;
const TOKENS =
  'Alfa Bravo Charlie Delta Echo Foxtrot Golf Hotel India Juliett Kilo Lima Mike November Oscar Papa Quebec Romeo Sierra Tango Uniform Victor Whiskey Xray Yankee Zulu';

export default async function aToZ({ botAppId }: BotInit, context: TurnContext) {
  const conversationReference = TurnContext.getConversationReference(context.activity);
  const replyToId = context.activity.id;

  conversationReference.activityId = context.activity.id || '';

  const { adapter } = context;

  const firstActivity = await context.sendActivity({
    channelData: {
      streamType: 'informative'
    },
    from: { role: 'bot' },
    text: 'Preparing to send A to Z...',
    timestamp: new Date(),
    type: 'typing'
  } as any);

  if (!firstActivity) {
    throw new Error('Failed to send first typing activity.');
  }

  // DLASE does not return `activity.id`.
  const { id: streamId } = firstActivity;

  const livestream = async (context: TurnContext) => {
    let match: RegExpMatchArray | null;
    let pattern = /\s/gu;
    let streamSequence = 0;

    while ((match = pattern.exec(TOKENS))) {
      const text = TOKENS.substring(0, match.index);

      await context.sendActivity({
        channelData: { streamId, streamSequence: ++streamSequence, streamType: 'streaming' },
        from: { role: 'bot' },
        text,
        timestamp: new Date(),
        type: 'typing'
      } as any);

      await sleep(CHUNK_INTERVAL);
    }

    await context.sendActivity({
      // channelData: { streamId, streamType: 'streaming' },
      channelData: { streamId, streamType: 'completion' },
      text: TOKENS,
      timestamp: new Date(),
      type: 'message'
    });
  };

  if (context.activity.serviceUrl === 'urn:botframework:namedpipe:bfv4.pipes') {
    // DLASE does not support proactive messaging, we just send it as-is.
    await livestream(context);
  } else {
    (async () => {
      // Sleep for 1s so we can see the informative message clearly.
      // We may not need this if Web Chat is debounce message change for accessibility reason.
      await sleep(1_000);

      'willContinue' in adapter && (adapter as { willContinue: (context: TurnContext) => {} }).willContinue(context);

      adapter.continueConversationAsync(botAppId, conversationReference, async context => {
        context.activity.id = replyToId || ''; // HACK: `replyToId` is a random UUID.

        await livestream(context);
      });
    })();
  }

  return;
}
