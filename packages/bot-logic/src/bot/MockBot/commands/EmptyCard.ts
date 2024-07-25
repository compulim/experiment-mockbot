import { TurnContext } from 'botbuilder';

import assets from '../assets/index.js';

const name = 'Empty card';

function help() {
  return {
    'emptycard': 'Show a empty message with suggested actions'
  };
}

async function processor(context: TurnContext) {
  await context.sendActivity({
    text: '',
    type: 'message',
    suggestedActions: {
      actions: [{
        type: 'imBack',
        title: 'Blue',
        value: 'Blue',
        image: assets['./square-icon.png']
      }, {
        type: 'imBack',
        title: 'Red',
        value: 'Red',
        image: assets['./square-icon-red.png']
      }, {
        type: 'imBack',
        title: 'Green',
        value: 'Green',
        image: assets['./square-icon-green.png']
      }],
      // TODO: Should we fill in the "to"?
      to: []
    }
  });
}

export { help, name, processor };
