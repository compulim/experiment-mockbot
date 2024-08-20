import ReactWebChat from 'botframework-webchat';
import { FluentThemeProvider } from 'botframework-webchat-fluent-theme';
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

  return (
    webChatAdapters && (
      <FluentThemeProvider>
        <ReactWebChat {...webChatAdapters} key={key} sendTypingIndicator={true} />
      </FluentThemeProvider>
    )
  );
});
