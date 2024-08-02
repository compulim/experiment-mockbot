import { MockBot } from '@microsoft/botframework-mockbot-bot-logic/with-assets';
import {
  createDirectLine,
  type CreateDirectLineInit
} from '@microsoft/botframework-mockbot-webchat-offline-chat-adapter';
import { ConversationState, MemoryStorage, UserState } from 'botbuilder';

export function createBotAsChatAdapter(
  init?: { conversationStartProperties: CreateDirectLineInit['conversationStartProperties'] } | undefined
) {
  const memory = new MemoryStorage();
  const conversationState = new ConversationState(memory);
  const userState = new UserState(memory);

  // const bot = new EchoBot({ botAppId: '', conversationState, userState });

  const bot = new MockBot({ botAppId: '', conversationState, userState });

  return createDirectLine({ bot, conversationStartProperties: init?.conversationStartProperties });
}
