import ReactWebChat from 'botframework-webchat';
import { memo, useMemo } from 'react';
import useChatAdapter from './data/useChatAdapter';

export default memo(function WebChat() {
  const [chatAdapter] = useChatAdapter();
  const key = useMemo(() => Date.now(), [chatAdapter]);

  return chatAdapter && <ReactWebChat directLine={chatAdapter} key={key} />;
});
