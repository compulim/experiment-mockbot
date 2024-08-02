import { type ActivityHandler } from 'botbuilder';

import { type LogicHandler } from './LogicHandler.js';
import WebChatAdapter from './WebChatAdapter.js';

export type CreateDirectLineInit = {
  bot: ActivityHandler;
  conversationStartProperties?: { locale?: string | undefined } | undefined;
  processor?: LogicHandler | undefined;
};

export const createDirectLine = ({ bot, conversationStartProperties, processor }: CreateDirectLineInit) => {
  const botAdapter = new WebChatAdapter({ conversationStartProperties });

  if (!processor) {
    botAdapter.processActivity(context => bot.run(context));
  } else {
    botAdapter.processActivity(processor);
  }

  return botAdapter.botConnection;
};
