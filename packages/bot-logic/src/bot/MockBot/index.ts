import { ActivityHandler, type ConversationState, type UserState } from 'botbuilder';

import commands from './commands.js';
import * as OAuthCard from './commands/OAuthCard2.js';
import reduceMap from './private/reduceMap.js';

let echoTypingConversations = new Set();
let echoTypingAsMessageConversations = new Set();

type BotInit = {
  botAppId: string;
  conversationState: ConversationState;
  userState: UserState;
};

export default class MockBot extends ActivityHandler {
  constructor({ conversationState }: BotInit) {
    super();

    const membersAddedActivityAccessor = conversationState.createProperty('membersAddedActivityAccessor');

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

      if (context.activity.type === 'event') {
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
      } else if (context.activity.type === 'messageReaction') {
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
      } else if (context.activity.type === 'message') {
        const {
          activity: { attachments = [], text }
        } = context;
        const cleanedText = (text || '').trim().replace(/\.$/, '');
        const command = (commands as any[]).find(({ pattern }) => pattern.test(cleanedText));

        if (command) {
          const { mode, pattern, processor } = command;
          const match = pattern.exec(cleanedText);

          if (mode === 'line') {
            await processor(context, cleanedText);
          } else {
            await processor(context, ...[].slice.call(match, 1));
          }
        } else if (/^echo-typing$/i.test(cleanedText)) {
          // We should "echoTyping" in a per-conversation basis
          const { id: conversationID } = context.activity.conversation;

          if (echoTypingConversations.has(conversationID)) {
            echoTypingConversations.delete(conversationID);
            await context.sendActivity('Will stop echoing `"typing"` event');
          } else {
            echoTypingConversations.add(conversationID);
            await context.sendActivity('Will echo `"typing"` event');
          }
        } else if (/^echo-typing-as-message$/i.test(cleanedText)) {
          // We should "echoTyping" in a per-conversation basis
          const { id: conversationID } = context.activity.conversation;

          if (echoTypingAsMessageConversations.has(conversationID)) {
            echoTypingAsMessageConversations.delete(conversationID);
            await context.sendActivity('Will stop echoing `"typing"` event as message');
          } else {
            echoTypingAsMessageConversations.add(conversationID);
            await context.sendActivity('Will echo `"typing"` event as message');
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
          await conversationState.load(context);

          const membersAddedActivity = await membersAddedActivityAccessor.get(context);

          await context.sendActivity(`\`\`\`\n${JSON.stringify(membersAddedActivity)}\n\`\`\``);
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
      } else if (context.activity.type === 'typing') {
        echoTypingConversations.has(context.activity.conversation.id) &&
          (await context.sendActivity({ type: 'typing' }));
        echoTypingAsMessageConversations.has(context.activity.conversation.id) &&
          (await context.sendActivity(`Received \`typing\` at ${new Date().toLocaleString()}.`));
      }
    });

    this.onMembersAdded(async (context, next) => {
      (await membersAddedActivityAccessor.get(context, {})).locale = context.activity.locale;

      await conversationState?.saveChanges(context);
      await next();
    });
  }
}
