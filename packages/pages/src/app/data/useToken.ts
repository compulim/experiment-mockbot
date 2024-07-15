import { useAppContext } from './private/AppContext';

export default function useToken() {
  return useAppContext().tokenState;
}
