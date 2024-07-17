import { EchoBot } from '@microsoft/botframework-mockbot-bot-logic';
import { createDirectLine } from '@microsoft/botframework-mockbot-webchat-offline-chat-adapter';
import { ConversationState, MemoryStorage, UserState } from 'botbuilder';

export function createBotAsChatAdapter() {
  const memory = new MemoryStorage();
  const conversationState = new ConversationState(memory);
  const userState = new UserState(memory);

  const bot = new EchoBot({ botAppId: '', conversationState, userState });

  return createDirectLine({ bot });
}
