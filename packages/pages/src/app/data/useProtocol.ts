import { useAppContext } from './private/AppContext';

export default function useProtocol() {
  return useAppContext().protocolState;
}
