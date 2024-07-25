import { TurnContext } from 'botbuilder';
import assets from '../assets/index.js';

const name = 'Image attachment';

function help() {
  return {
    'image': 'Show an image attachment'
  };
}

async function processor(context: TurnContext) {
  await context.sendActivity({
    type: 'message',
    attachments: [{
      contentType: 'image/jpeg',
      contentUrl: assets['./surface1.jpg'],
      name: 'Microsoft Surface'
    }]
  });
}

export { help, name, processor };
