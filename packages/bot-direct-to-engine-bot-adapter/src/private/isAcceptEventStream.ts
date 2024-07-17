import { parse as parseContentType } from 'content-type';

export default function isAcceptEventStream(accept: string = '') {
  return !!accept
    .split(',')
    .map(parseContentType)
    .find(({ type }) => type === 'text/event-stream');
}
