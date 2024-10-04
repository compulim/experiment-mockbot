import { TurnContext } from 'botbuilder';

import RichMessage from './Cards/1.0/RichMessage.js';
import Weather from './Cards/1.0/Weather.js';
import FlightUpdate from './Cards/FlightUpdate.js';
import getCardJSON from './Cards/getCardJSON.js';

const name = 'Adaptive Card';

function help() {
  return {
    'card arabicgreeting': 'Show a greeting in Arabic (for RTL)',
    'card bingsports': 'Show Bing sports using Adaptive Card',
    'card breakfast': 'Show breakfast review using Adaptive Card',
    'card broken:lang': 'Show an Adaptive Card that is broken because of invalid language identifier',
    'card broken': 'Show an Adaptive Card that is broken because of invalid version',
    'card containerstyles': 'Show a card with Adaptive Card containers',
    'card flight': 'Show flight update using Adaptive Card',
    'card flighttracking': 'Show flight tracking using Adaptive Card',
    'card inputs': 'Show an Adaptive Card with all types of inputs',
    'card markdown': 'Show Markdown using Adaptive Card',
    'card ol': 'Show an ordered list with Markdown',
    'card product video': 'Show a product video using Adaptive Cards',
    'card reminder': 'Show a reminder using Adaptive Card',
    'card restaurant': 'Show restaurant information using Adaptive Card',
    'card review': 'Show review using Adaptive Card',
    'card richmessage': 'Show a rich message using Adaptive Card',
    'card simple': 'Show a simple Adaptive Card',
    'card sportsclub': 'Show a comprehensive sports club POI using Adaptive Card',
    'card ul': 'Show an unordered list with Markdown',
    'card weather': 'Show weather forecast using Adaptive Card'
  };
}

async function processor(context: TurnContext, ...names: string[]) {
  if (/^what/iu.test(names[0] || '')) {
    await context.sendActivity({
      type: 'message',
      speak: 'Here is the forecast for this week.',
      attachmentLayout: 'carousel',
      attachments: [
        {
          contentType: 'application/vnd.microsoft.card.adaptive',
          content: Weather()
        },
        {
          contentType: 'application/vnd.microsoft.card.adaptive',
          content: FlightUpdate()
        },
        {
          contentType: 'application/vnd.microsoft.card.adaptive',
          content: RichMessage()
        }
      ]
    });

    return;
  }

  if (/^arabic greeting|^arabicgreeting|رحب بالقارئ/iu.test(context.activity.text)) {
    const content = getCardJSON('arabicgreeting');

    await context.sendActivity({
      type: 'message',
      attachments: [
        {
          contentType: 'application/vnd.microsoft.card.adaptive',
          content
        }
      ]
    });

    return;
  }

  const contents = names.filter(name => name).map(name => getCardJSON(name));

  if (contents && contents.length) {
    let text = `Showing ${names.filter(name => name).join(', ')}`;

    await context.sendActivity({
      type: 'message',
      text,
      attachmentLayout: 'carousel',
      attachments: contents.map(content => ({
        contentType: 'application/vnd.microsoft.card.adaptive',
        content
      }))
    });
  } else {
    await context.sendActivity({
      type: 'message',
      text: `No card named '${name}'`
    });
  }
}

export { help, name, processor };
