import { createContext, useContext, type Dispatch, type SetStateAction } from 'react';
import type { Protocol } from '../../types/Protocol';
import type { WebChatAdapters } from '../../types/WebChatAdapters';

type AppContextType = {
  protocolState: readonly [Protocol, Dispatch<SetStateAction<Protocol>>];
  tokenState: readonly [string] | readonly never[];
  webChatAdaptersState: readonly [WebChatAdapters] | readonly never[];
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
