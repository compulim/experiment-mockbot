import 'dotenv/config';

// @ts-ignore we will turn everything into CJS
import { hostBotAsAzureWebApps } from '@microsoft/botframework-mockbot-bot-host';
// @ts-ignore we will turn everything into CJS
import { MockBot } from '@microsoft/botframework-mockbot-bot-logic';
import { ConversationState, MemoryStorage, UserState } from 'botbuilder';
import { object, optional, parse, string } from 'valibot';

(async function () {
  const { MicrosoftAppId } = parse(
    object({
      MicrosoftAppId: optional(string())
    }),
    process.env
  );

  const memory = new MemoryStorage();
  const conversationState = new ConversationState(memory);
  const userState = new UserState(memory);

  const bot = new MockBot({ botAppId: MicrosoftAppId || '', conversationState, userState });

  await hostBotAsAzureWebApps(bot);
})();
