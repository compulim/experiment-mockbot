import { ActivityHandler, type ConversationState, type UserState } from 'botbuilder';
import Bot from './Bot.js';

type BotInit = {
  botAppId: string;
  conversationState?: ConversationState;
  userState?: UserState;
};

export default class ToDoBot extends ActivityHandler {
  constructor(_init: BotInit) {
    super();

    const bot = new Bot();

    this.onTurn(async context => bot.run(context));
  }
}
