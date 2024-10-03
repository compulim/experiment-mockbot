import { ActivityHandler, type ConversationState, type TurnContext, type UserState } from 'botbuilder';

import commands from './commands.js';
import * as OAuthCard from './commands/OAuthCard2.js';
import aToZ from './commands2/aToZ.js';
import proactive from './commands2/proactive.js';
import reduceMap from './private/reduceMap.js';

export type BotInit = {
  botAppId: string;
  conversationState: ConversationState;
  userState: UserState;
};

export default class MockBot extends ActivityHandler {
  #conversationState: ConversationState;
  #userState: UserState;

  constructor(init: BotInit) {
    super();

    const { conversationState, userState } = init;

    this.#conversationState = conversationState;
    this.#userState = userState;

    const echoTypingAccessor = conversationState.createProperty('echoTyping');
    const echoTypingAsMessageAccessor = conversationState.createProperty('echoTypingAsMessage');
    const membersAddedActivityAccessor = conversationState.createProperty('membersAddedActivityAccessor');

    this.onEvent(async context => {
      if (context.activity.name === 'tokens/response') {
        // Special handling for OAuth token exchange
        // This event is sent thru the non-magic code flow
        await OAuthCard.processor(context);
      } else if (context.activity.name === 'webchat/join') {
        await context.sendActivity(
          `Got \`webchat/join\` event, your language is \`${(context.activity.value || {}).language}\``
        );
      } else if (context.activity.name === 'webchat/ping') {
        await context.sendActivity({ type: 'event', name: 'webchat/pong', value: context.activity.value });
      }
    });

    // See https://aka.ms/about-bot-activity-message to learn more about the message and other activity types.
    this.onMessage(async context => {
      const sendActivity = context.sendActivity.bind(context);

      context.sendActivity = (...args) => {
        let activity = args[0];

        if (typeof activity === 'string') {
          activity = {
            type: 'message',
            text: activity
          };
        }

        return sendActivity(...args);
      };

      const {
        activity: { attachments = [], text }
      } = context;
      const cleanedText = (text || '').trim().replace(/\.$/, '');
      const command = (commands as any[]).find(({ pattern }) => pattern.test(cleanedText));

      if (/^proactive(\s+([\d\w]+))*?\.?$/iu.test(cleanedText)) {
        await proactive(context, init.botAppId, cleanedText.substring(10));
      } else if (command) {
        const { mode, pattern, processor } = command;
        const match = pattern.exec(cleanedText);

        if (mode === 'line') {
          await processor(context, cleanedText);
        } else {
          await processor(context, ...[].slice.call(match, 1));
        }
      } else if (/^echo-typing$/i.test(cleanedText)) {
        // We should "echoTyping" in a per-conversation basis

        if (await echoTypingAccessor.get(context)) {
          await context.sendActivity('Will stop echoing `"typing"` event');
          await echoTypingAccessor.delete(context);
        } else {
          await context.sendActivity('Will echo `"typing"` event');
          await echoTypingAccessor.set(context, true);
        }
      } else if (/^echo-typing-as-message$/i.test(cleanedText)) {
        // We should "echoTyping" in a per-conversation basis

        if (await echoTypingAsMessageAccessor.get(context)) {
          await context.sendActivity('Will stop echoing `"typing"` event as message');
          await echoTypingAsMessageAccessor.delete(context);
        } else {
          await context.sendActivity('Will echo `"typing"` event as message');
          await echoTypingAsMessageAccessor.set(context, true);
        }
      } else if (/^help$/i.test(cleanedText)) {
        const attachments = commands.map(({ help, name }) => {
          return {
            contentType: 'application/vnd.microsoft.card.thumbnail',
            content: {
              buttons: reduceMap(
                help(),
                (result: { title: string; type: string; value: string }[], title: string, value: string) => [
                  ...result,
                  {
                    title,
                    type: 'imBack',
                    value
                  }
                ],
                []
              ).sort(({ title: x }, { title: y }) => (x > y ? 1 : x < y ? -1 : 0)),
              title: name
            }
          };
        });

        await context.sendActivity({
          attachments: attachments.sort(({ content: { title: x } }, { content: { title: y } }) =>
            x > y ? 1 : x < y ? -1 : 0
          )
        });
      } else if (/^help simple$/i.test(cleanedText)) {
        await context.sendActivity(
          `### Commands\r\n\r\n${commands
            .map(({ pattern }) => `- \`${pattern.source}\``)
            .sort()
            .join('\r\n')}`
        );
      } else if (cleanedText === 'conversationstart') {
        const locale = await membersAddedActivityAccessor.get(context);

        await context.sendActivity(`\`\`\`\n${JSON.stringify(locale, null, 2)}\n\`\`\``);
      } else if (cleanedText === 'atoz') {
        return aToZ(init, context);
      } else if (attachments.length) {
        const result = commands.find(({ pattern }) => pattern.test('upload'));

        await (result?.processor as any)(context, attachments);
      } else if (context.activity.value) {
        const { text, value } = context.activity;
        const attachments = [];

        text &&
          attachments.push({
            content: text,
            contentType: 'text/plain'
          });

        value &&
          attachments.push({
            content: `\`\`\`\n${JSON.stringify(value, null, 2)}\n\`\`\``,
            contentType: 'text/markdown'
          });

        await context.sendActivity({
          text: 'You posted',
          type: 'message',
          attachments
        });
      } else {
        await context.sendActivity({
          speak: `Unknown command: I don't know ${cleanedText}. You can say "help" to learn more.`,
          text: `Unknown command: \`${cleanedText}\`.\r\n\r\nType \`help\` to learn more.`,
          type: 'message'
        });
      }
    });

    this.onMessageReaction(async context => {
      const {
        activity: { reactionsAdded = [], reactionsRemoved = [] }
      } = context;
      const attachments = [...reactionsAdded, ...reactionsRemoved].map(reaction => ({
        content: `\`\`\`\n${JSON.stringify(reaction, null, 2)}\n\`\`\``,
        contentType: 'text/markdown'
      }));

      await context.sendActivity({
        text: 'You posted',
        type: 'message',
        attachments
      });
    });

    this.onTyping(async (context, next) => {
      if (await echoTypingAccessor.get(context)) {
        await context.sendActivity({ type: 'typing' });
      }

      if (await echoTypingAsMessageAccessor.get(context)) {
        await context.sendActivity(`Received \`typing\` at ${new Date().toLocaleString()}.`);
      }

      await next();
    });

    this.onMembersAdded(async (context, next) => {
      await membersAddedActivityAccessor.set(context, { locale: context.activity.locale });

      await next();
    });
  }

  override async run(context: TurnContext): Promise<void> {
    await super.run(context);

    await this.#conversationState.saveChanges(context, false);
    await this.#userState.saveChanges(context, false);
  }
}
