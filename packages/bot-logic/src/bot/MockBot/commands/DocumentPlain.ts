import { TurnContext } from 'botbuilder';

import assets from '../assets/index.js';

const name = 'Plain document attachment';

function help() {
  return {
    'document-plain': 'Show a plain document as attachment'
  };
}

async function processor(context: TurnContext) {
  await context.sendActivity({
    type: 'message',
    attachments: [{
      contentType: 'text/plain',
      contentUrl: assets['./test.txt'],
      name: 'test.txt'
    }]
  });
}

export { help, name, processor };
