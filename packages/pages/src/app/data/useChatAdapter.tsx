import { useAppContext } from './private/AppContext';

export default function useChatAdapter() {
  return useAppContext().chatAdapterState;
}
