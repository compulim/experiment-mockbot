import type { TurnContext } from 'botbuilder';

import * as Accessibility from './commands/Accessibility.js';
import * as AdaptiveCard from './commands/AdaptiveCard.js';
import * as AnimationCard from './commands/AnimationCard.js';
// import * as All from "./commands/All";
import * as ArabicCarousel from './commands/ArabicCarousel.js';
import * as ArabicFile from './commands/ArabicFile.js';
import * as ArabicMarkdown from './commands/ArabicMarkdown.js';
import * as Audio from './commands/Audio.js';
import * as AudioCard from './commands/AudioCard.js';
import * as CardActions from './commands/CardActions.js';
import * as Carousel from './commands/Carousel.js';
import * as ChannelData from './commands/ChannelData.js';
import * as Citation from './commands/Citation.js';
import * as DocumentDataURI from './commands/DocumentDataURI.js';
import * as DocumentPlain from './commands/DocumentPlain.js';
import * as DocumentWord from './commands/DocumentWord.js';
import * as DumpActivity from './commands/DumpActivity.js';
import * as Echo from './commands/Echo.js';
import * as EchoSpeak from './commands/EchoSpeak.js';
import * as EmptyCard from './commands/EmptyCard.js';
import * as File from './commands/File.js';
import * as HeroCard from './commands/HeroCard.js';
import * as HeroCardActions from './commands/HeroCardActions.js';
import * as Image from './commands/Image.js';
import * as ImageSVG from './commands/ImageSVG.js';
import * as InputHint from './commands/InputHint.js';
import * as InvalidCard from './commands/InvalidCard.js';
import * as Layout from './commands/Layout.js';
import * as Localization from './commands/Localization.js';
import * as Markdown from './commands/Markdown.js';
import * as MultimediaCard from './commands/MultimediaCard.js';
import * as OAuthCard from './commands/OAuthCard2.js';
import * as Proactive from './commands/Proactive.js';
import * as ReceiptCard from './commands/ReceiptCard.js';
import * as SampleBackchannel from './commands/SampleBackchannel.js';
import * as SampleGitHubRepository from './commands/SampleGitHubRepository.js';
import * as SamplePasswordInput from './commands/SamplePasswordInput.js';
import * as SampleReduxMiddleware from './commands/SampleReduxMiddleware.js';
import * as SignInCard from './commands/SignInCard.js';
import * as Slow from './commands/Slow.js';
import * as Speech from './commands/Speech.js';
import * as SuggestedActionsCard from './commands/SuggestedActionsCard.js';
import * as Text from './commands/Text.js';
import * as ThumbnailCard from './commands/ThumbnailCard.js';
import * as Timestamp from './commands/Timestamp.js';
import * as Typing from './commands/Typing.js';
import * as Unknown from './commands/Unknown.js';
import * as Upload from './commands/Upload.js';
import * as User from './commands/User.js';
import * as Video from './commands/Video.js';
import * as VideoCard from './commands/VideoCard.js';
import * as Xml from './commands/Xml.js';

export default [
  { pattern: 'accessibility', ...Accessibility },
  {
    pattern: /^card(\s+[\d\w:]+)(\s+[\d\w:]+)?(\s+[\d\w:]+)?(\s+[\d\w:]+)?(\s+[\d\w:]+)?/i,
    ...AdaptiveCard
  },
  {
    pattern: /^(what).*?weather/i,
    ...AdaptiveCard
  },
  {
    pattern: /^arabic greeting|^arabicgreeting|رحب بالقارئ/i,
    ...AdaptiveCard
  },
  // { pattern: /all/i, ...All },
  { pattern: 'animationcard', ...AnimationCard },
  { pattern: 'audio', ...Audio },
  { pattern: /^arabic carousel|يشترى/i, ...ArabicCarousel },
  { pattern: /^arabic file$|تحميل/i, ...ArabicFile },
  { pattern: /arabic markdown$|نص/i, ...ArabicMarkdown },
  { pattern: 'audiocard', ...AudioCard },
  { pattern: 'card-actions', ...CardActions },
  { pattern: 'carousel', ...Carousel },
  { pattern: 'channel-data', ...ChannelData },
  { pattern: 'citation', ...Citation },
  { pattern: 'document-data-uri', ...DocumentDataURI },
  { pattern: 'document-plain', ...DocumentPlain },
  { pattern: 'document-word', ...DocumentWord },
  { pattern: 'dump-activity', ...DumpActivity },
  { pattern: /^echo\s/i, ...Echo },
  { pattern: /^echoSpeak\s/i, ...EchoSpeak },
  { pattern: 'emptycard', ...EmptyCard },
  { pattern: 'file', ...File },
  { pattern: 'herocard', ...HeroCard },
  { pattern: /^herocard(\s+([\d\w]+))*$/i, ...HeroCard },
  { pattern: /^herocarda/i, ...HeroCardActions },
  { pattern: /^hint(\s+[\d\w]+)?(\s+[\d\w]+)?/i, ...InputHint },
  { pattern: 'image', ...Image },
  { pattern: 'image-svg', ...ImageSVG },
  { pattern: /^input[\-\s]hint(\s+[\d\w]+)?(\s+[\d\w]+)?/i, ...InputHint },
  { pattern: 'invalidcard', ...InvalidCard },
  { pattern: /^layout(\s+[\d\w]+)?(\s+[\d\w]+)?/i, ...Layout },
  { pattern: 'localization', ...Localization },
  { pattern: /^markdown(\s+([\d\w]+))?(\s+([\d\w]+))?$/i, ...Markdown },
  { pattern: 'content-multimedia', ...MultimediaCard },
  { pattern: /^(oauth(\s+[\d\w]+)?|\d{6})$/i, ...OAuthCard },
  { pattern: 'sample:password-input', ...SamplePasswordInput },
  { pattern: /^proactive(\s+([\d\w]+))*?\.?$/iu, ...Proactive },
  { pattern: /^receiptcard[\d]?/i, ...ReceiptCard },
  { pattern: 'sample:backchannel', ...SampleBackchannel },
  { pattern: 'sample:github-repository', ...SampleGitHubRepository },
  {
    pattern: /^sample:redux-middleware(\s+[\d\w\-]+)*$/i,
    ...SampleReduxMiddleware
  },
  { pattern: 'signin', ...SignInCard },
  { pattern: /^slow(\s+[\d\w]+)?/i, ...Slow },
  { pattern: 'speech', ...Speech },
  { pattern: /^suggested\-actions(\s+[\d\w]+)?/i, ...SuggestedActionsCard },
  { pattern: /Tell.*?story/iu, ...Speech },
  { pattern: 'text', ...Text },
  {
    pattern: /^thumbnailcard(\s+([\d\w]+))?(\s+([\d\w]+))?$/i,
    ...ThumbnailCard
  },
  { pattern: /^timestamp(\s+[\d\w]+)?/i, ...Timestamp },
  { pattern: /^typing(\s+[\d\w]+)?/i, ...Typing },
  { pattern: /^unknown(\s+[\d\w]+)?/i, ...Unknown },
  { pattern: 'upload', ...Upload },
  { pattern: /^user(\s+[\d\w]+)?/i, ...User },
  { pattern: /^video(\s+([\d\w]+))?$/i, ...Video },
  { pattern: 'videocard', ...VideoCard },
  { pattern: 'xml', ...Xml }
].map(
  command =>
    ({
      ...command,
      pattern: typeof command.pattern === 'string' ? new RegExp(`^${command.pattern}$`, 'i') : command.pattern
    } satisfies Command)
);

export type Command = {
  pattern: RegExp;
  processor: (context: TurnContext, ...args: any[]) => Promise<unknown>;
};
