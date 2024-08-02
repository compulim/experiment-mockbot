import ReactWebChat from 'botframework-webchat';
import { memo, useMemo } from 'react';
import useWebChatAdapters from './data/useWebChatAdapters';

// const USE_BUNDLE = (() => {
//   try {
//     return new URLSearchParams(location.search).has('bundle');
//   } catch {
//     return false;
//   }
// })();

export default memo(function WebChat() {
  const [webChatAdapters] = useWebChatAdapters();
  const key = useMemo(() => Date.now(), [webChatAdapters]);

  return webChatAdapters && <ReactWebChat {...webChatAdapters} key={key} sendTypingIndicator={true} />;
});
