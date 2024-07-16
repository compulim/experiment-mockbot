import { useAppContext } from './private/AppContext';

export default function useWebChatAdapters() {
  return useAppContext().webChatAdaptersState;
}
