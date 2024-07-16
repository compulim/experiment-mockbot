import type { DirectLineJSBotConnection } from 'copilot-studio-direct-to-engine-chat-adapter';
import { createContext, useContext, type Dispatch, type SetStateAction } from 'react';
import type { Protocol } from '../../types/Protocol';

type AppContextType = {
  chatAdapterState: readonly [DirectLineJSBotConnection] | readonly never[];
  protocolState: readonly [Protocol, Dispatch<SetStateAction<Protocol>>];
  tokenState: readonly [string] | readonly never[];
};

const AppContext = createContext<AppContextType>(
  new Proxy({} as AppContextType, {
    get() {
      throw new Error('Cannot use this hook outside of <AppContext>.');
    }
  })
);

const useAppContext = () => useContext(AppContext);

export { AppContext, useAppContext };
export type { AppContextType };
