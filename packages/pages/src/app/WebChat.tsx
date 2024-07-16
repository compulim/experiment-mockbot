import ReactWebChat from 'botframework-webchat';
import { memo } from 'react';
import useChatAdapter from './data/useChatAdapter';

export default memo(function WebChat() {
  const [chatAdapter] = useChatAdapter();

  return chatAdapter && <ReactWebChat directLine={chatAdapter} />;
});
