import { type ActivityHandler } from 'botbuilder';

import { type LogicHandler } from './LogicHandler.js';
import WebChatAdapter from './WebChatAdapter.js';

type CreateDirectLineInit = {
  bot: ActivityHandler;
  processor?: LogicHandler;
};

export const createDirectLine = ({ bot, processor }: CreateDirectLineInit) => {
  const botAdapter = new WebChatAdapter();

  if (!processor) {
    botAdapter.processActivity(context => bot.run(context));
  } else {
    botAdapter.processActivity(processor);
  }

  return botAdapter.botConnection;
};
