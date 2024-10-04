import { MessageFactory, TurnContext } from 'botbuilder';
import getCardJSON from '../commands/Cards/getCardJSON.js';

export default async function printCard(context: TurnContext, cardName: string = '') {
  await context.sendActivity(MessageFactory.text(`Printing "${cardName}" card JSON.`));

  await context.sendActivity({
    entities: [
      {
        '@context': 'https://schema.org',
        '@id': '',
        '@type': 'Message',
        keywords: ['AllowCopy'],
        type: 'https://schema.org/Message'
      }
    ],
    text: `\`\`\`json\n${JSON.stringify(getCardJSON(cardName), null, 2)}\n\`\`\``,
    type: 'message'
  });
}
