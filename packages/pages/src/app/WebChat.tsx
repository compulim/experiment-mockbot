import ReactWebChat from 'botframework-webchat';
import { memo, useEffect, useMemo, useRef } from 'react';
import { unmountComponentAtNode } from 'react-dom';
import useWebChatAdapters from './data/useWebChatAdapters';

const USE_BUNDLE = (() => {
  try {
    return new URLSearchParams(location.search).has('bundle');
  } catch {
    return false;
  }
})();

console.log({ USE_BUNDLE });

export default memo(function WebChat() {
  const [webChatAdapters] = useWebChatAdapters();
  const webChatRef = useRef<HTMLDivElement>(null);
  const key = useMemo(() => Date.now(), [webChatAdapters]);

  useEffect(() => {
    const { current } = webChatRef;

    if (current) {
      USE_BUNDLE && webChatAdapters && (window as any).WebChat.renderWebChat({ ...webChatAdapters }, current);

      return () => unmountComponentAtNode(current);
    }

    return () => {};
  }, [key, webChatAdapters]);

  if (USE_BUNDLE) {
    return <div key={key} ref={webChatRef} />;
  } else {
    return webChatAdapters && <ReactWebChat {...webChatAdapters} key={key} />;
  }
});
