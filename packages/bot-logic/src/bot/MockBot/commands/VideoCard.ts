import { TurnContext } from 'botbuilder';
import assets from '../assets/index.js';

const name = 'Video card';

function help() {
  return {
    'videocard': 'Show a video card'
  };
}

async function processor(context: TurnContext) {
  await context.sendActivity({
    type: 'message',
    attachments: [{
      contentType: 'application/vnd.microsoft.card.video',
      content: {
        title: 'Microsoft Band',
        subtitle: 'Large Video',
        text: 'No buttons, No Image, Autoloop, No Sharable',
        media: [{
          url: assets['./msband.mp4'],
          profile: 'videocard'
        }],
        image: { imageAltText: 'Microsoft Band', url: assets['./ms-band1.jpg'] },
        autoloop: true,
        autostart: false
      }
    }]
  });
}

export { help, name, processor };
