import { TurnContext } from 'botbuilder';
import assets from '../assets/index.js';

const name = 'SVG image attachment';

function help() {
  return {
    'image-svg': 'Show a SVG image attachment'
  };
}

async function processor(context: TurnContext) {
  await context.sendActivity({
    type: 'message',
    attachments: [{
      contentType: 'image/svg+xml',
      contentUrl: assets['./bf_square.svg'],
      name: 'Microsoft Bot Framework'
    }]
  });
}

export { help, name, processor };

