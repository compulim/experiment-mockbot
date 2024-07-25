import { TurnContext } from 'botbuilder';

import assets from '../assets/index.js';

const name = 'File attachments';

function help() {
  return {
    'file': 'Show a message with a text file and Word document attachments'
  };
}

async function processor(context: TurnContext) {
  await context.sendActivity({
    type: 'message',
    text: 'The reports are ready, see attached.',
    attachments: [{
      contentType: 'application/octet-stream',
      contentUrl: assets['./test.txt'],
      name: 'Plain text'
    }, {
      contentType: 'application/octet-stream',
      contentUrl: assets['./test.docx'],
      name: 'Word document'
    }]
  });
}

export { help, name, processor };
