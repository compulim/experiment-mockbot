import ReactWebChat from 'botframework-webchat';
import { memo, useMemo } from 'react';
import useWebChatAdapters from './data/useWebChatAdapters';

export default memo(function WebChat() {
  const [webChatAdapters] = useWebChatAdapters();
  const key = useMemo(() => Date.now(), [webChatAdapters]);

  return webChatAdapters && <ReactWebChat {...webChatAdapters} key={key} />;
});
