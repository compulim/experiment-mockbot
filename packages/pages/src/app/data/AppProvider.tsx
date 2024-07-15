import { memo, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Protocol } from '../types/Protocol';
import { AppContext, AppContextType } from './private/AppContext';
import fetchJSON from './private/fetchJSON';

declare global {
  const TOKEN_APP_URL: string;
}

type Props = {
  children?: ReactNode | undefined;
};

export default memo(function AppProvider({ children }: Props) {
  const protocolState = Object.freeze(useState<Protocol>('direct line'));
  const [token, setToken] = useState<string | undefined>(undefined);

  const tokenState = useMemo(() => Object.freeze([token] as const), [token]);

  useEffect(() => {
    const abortController = new AbortController();

    setToken(undefined);

    (async (protocol, signal) => {
      let token: string;

      switch (protocol) {
        case 'direct line':
          ({ token } = await fetchJSON(new URL('api/token/directline', TOKEN_APP_URL), { signal }));
          break;

        case 'direct line ase':
          ({ token } = await fetchJSON(new URL('api/token/directlinease', TOKEN_APP_URL), { signal }));
          break;

        default:
          throw new Error('To be implemented.');
      }

      signal.aborted || setToken(token);
    })(protocolState[0], abortController.signal);

    return () => abortController.abort();
  }, [protocolState[0], setToken]);

  const context = useMemo<AppContextType>(
    () =>
      Object.freeze({
        protocolState,
        tokenState
      }),
    [protocolState, tokenState]
  );

  return <AppContext.Provider value={context}>{children}</AppContext.Provider>;
});
