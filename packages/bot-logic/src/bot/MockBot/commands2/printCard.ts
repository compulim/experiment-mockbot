import { MessageFactory, TurnContext } from 'botbuilder';
import getCardJSON from '../commands/Cards/getCardJSON.js';

export default async function printCard(context: TurnContext, cardName: string = '') {
  context.sendActivities([
    MessageFactory.text(`Printing "${cardName}".`),
    {
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
    }
  ]);
}
