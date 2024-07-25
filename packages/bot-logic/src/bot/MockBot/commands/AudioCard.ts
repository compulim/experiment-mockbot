import { TurnContext } from 'botbuilder';

import assets from '../assets/index.js';

const name = 'Audio card';

function help() {
  return {
    'audiocard': 'Show an audio card'
  };
}

async function processor(context: TurnContext) {
  await context.sendActivity({
    type: 'message',
    attachments: [{
      contentType: 'application/vnd.microsoft.card.audio',
      content: {
        title: 'BotFramework Test',
        subtitle: 'audio test',
        text: 'No buttons, No Image, Autoloop, Sharable',
        media: [{
          profile: 'audiocard',
          url: assets['./bftest.mp3']
        }],
        autoloop: true,
        autostart: false
      }
    }]
  });
}

export { help, name, processor };
