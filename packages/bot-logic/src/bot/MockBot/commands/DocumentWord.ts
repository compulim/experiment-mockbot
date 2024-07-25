import { TurnContext } from 'botbuilder';

import assets from '../assets/index.js';

const name = 'Word document attachment';

function help() {
  return {
    'document-word': 'Show a Word document as attachment'
  };
}

async function processor(context: TurnContext) {
  await context.sendActivity({
    type: 'message',
    attachments: [{
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      contentUrl: assets['./test.docx'],
      name: 'test.docx'
    }]
  });
}

export { help, name, processor };
