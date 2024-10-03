import { TurnContext } from 'botbuilder';
import type { BotInit } from '../index.js';
import sleep from '../private/sleep.js';

const name = 'Proactive message';
const WAIT_INTERVAL = 5000;

function help() {
  return {
    proactive: 'Proactively send a message later'
  };
}

async function processor(context: TurnContext, botAppId: string, args: string = '') {
  const reference = TurnContext.getConversationReference(context.activity);

  await context.sendActivity({
    speak: 'Will send a proactive message soon.',
    type: 'message',
    text: `Will send a proactive message after ${
      WAIT_INTERVAL / 1000
    } seconds. Attached is the JSON of the conversation \`reference\` that will be used to reinstantiate the \`TurnContext\`.`,
    attachments: [
      {
        content: `\`\`\`\n${JSON.stringify(reference, null, 2)}\n\`\`\``,
        contentType: 'text/markdown'
      }
    ]
  });

  (async function (reference, adapter) {
    // We specifically write this block of code to show how proactive message should work.
    // This block of code should run under another process and it will only have knowledge of adapter setup and conversation reference.
    await sleep(WAIT_INTERVAL);

    adapter.continueConversationAsync(botAppId, reference, async continuedContext => {
      const command = args.trim().toLowerCase();

      if (command === 'card') {
        await continuedContext.sendActivity({
          type: 'message',
          text: 'Where are you from?',
          attachments: [
            {
              contentType: 'application/vnd.microsoft.card.hero',
              content: {
                buttons: [
                  {
                    title: 'United States',
                    type: 'imBack',
                    value: 'herocard qna 2 I am from United States.'
                  },
                  {
                    title: 'Hong Kong',
                    type: 'imBack',
                    value: 'I am from Hong Kong.'
                  }
                ]
              }
            }
          ]
        });
      } else {
        await continuedContext.sendActivity({
          speak: 'This is a proactive message.',
          text: 'This is a proactive message.',
          type: 'message'
        });
      }
    });
  })(reference, context.adapter);
}

export { help, name, processor };
