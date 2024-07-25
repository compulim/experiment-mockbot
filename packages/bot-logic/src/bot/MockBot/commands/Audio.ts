import { TurnContext } from 'botbuilder';

import assets from '../assets/index.js';

const name = 'Audio attachment';

function help() {
  return {
    'audio': 'Show an audio attachment'
  };
}

async function processor(context: TurnContext) {
  await context.sendActivity({
    type: 'message',
    text: '',
    attachments: [{
      contentType: 'audio/mpeg',
      contentUrl: assets['./bftest.mp3'],
      name: 'BotFramework Test'
    }]
  });
}

export { help, name, processor };
