import { MockBot } from '@microsoft/botframework-mockbot-bot-logic/with-assets';
import { createDirectLine } from '@microsoft/botframework-mockbot-webchat-offline-chat-adapter';
// import { ConversationState, MemoryStorage, UserState } from 'botbuilder';

export function createBotAsChatAdapter() {
  // const memory = new MemoryStorage();
  // const conversationState = new ConversationState(memory);
  // const userState = new UserState(memory);

  // const bot = new EchoBot({ botAppId: '', conversationState, userState });

  const bot = new MockBot({ botAppId: '' });

  return createDirectLine({ bot });
}
