import { TurnContext } from 'botbuilder';
import assets from '../assets/index.js';

const name = 'Multiple media attachments';

function help() {
  return {
    'content-multimedia': 'Show animation, audio, and video attachments in a single message'
  };
}

async function processor(context: TurnContext) {
  await context.sendActivity({
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.animation',
        content: {
          title: 'Multimedia Content',
          subtitle: 'Subtitle',
          text: 'Text',
          media: [
            { url: assets['./surface_anim.gif'], profile: 'animation' },
            { url: assets['./surface_anim.gif'], profile: 'animation2' }
          ],
          autoloop: true,
          autostart: true
        }
      },
      {
        contentType: 'application/vnd.microsoft.card.audio',
        content: {
          title: 'BotFramework Test',
          subtitle: 'audio test',
          text: 'No buttons, No Image, Autoloop, Sharable',
          media: [
            { url: assets['./bftest.mp3'], profile: 'audiocard' },
            { url: assets['./bftest.mp3'], profile: 'audiocard2' }
          ],
          autoloop: true,
          autostart: false
        }
      },
      {
        contentType: 'application/vnd.microsoft.card.video',
        content: {
          title: 'Microsoft Band',
          subtitle: 'Large Video',
          text: 'No buttons, No Image, Autoloop, No Sharable',
          media: [
            { url: assets['./msband.mp4'], profile: 'videocard' },
            { url: assets['./msband.mp4'], profile: 'videocard2' }
          ],
          image: { url: assets['./ms-band1.jpg'] },
          autoloop: true,
          autostart: false
        }
      }
    ]
  });
}

export { help, name, processor };
