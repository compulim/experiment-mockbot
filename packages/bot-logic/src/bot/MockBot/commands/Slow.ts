import { TurnContext } from 'botbuilder';
import assets from '../assets/index.js';

const name = 'Images on emulated slow network';

function help() {
  return {
    'slow': 'Show 4 images with emulated slow network'
  };
}

async function processor(context: TurnContext, ...args: string[]) {
  const arg = (args[0] || '').trim();

  if (arg === 'markdown') {
    await context.sendActivity([
      'This Markdown text contains few images with emulated slow network.',
      '',
      `![Photo 1](${assets['./surface1.jpg']}?slow)`,
      '',
      `![Photo 2](${assets['./surface2.jpg']}?slow)`,
      '',
      `![Photo 3](${assets['./surface3.jpg']}?slow)`,
      '',
      `![Photo 4](${assets['./surface4.jpg']}?slow)`
    ].join('\n'));
  } else {
    const arg = args.map(arg => (arg || '').trim()).filter(arg => arg).join(' ');

    switch (arg) {
      case 'carousel':
      default:
        await context.sendActivity({
          type: 'message',
          text: 'This command will slowly show 4 images in carousel',
          attachmentLayout: 'carousel',
          attachments: [{
            contentType: 'image/jpg',
            contentUrl: `${assets['./surface1.jpg']}?slow`,
            name: 'Microsoft Surface Front View'
          }, {
            contentType: 'image/jpg',
            contentUrl: `${assets['./surface2.jpg']}?slow`,
            name: 'Microsoft Surface Back View'
          }, {
            contentType: 'image/jpg',
            contentUrl: `${assets['./surface3.jpg']}?slow`,
            name: 'Microsoft Surface Side Zoom'
          }, {
            contentType: 'image/jpg',
            contentUrl: `${assets['./surface4.jpg']}?slow`,
            name: 'Microsoft Surface Keyboard Zoom'
          }]
        });

        break;
    }
  }
}

export { help, name, processor };
