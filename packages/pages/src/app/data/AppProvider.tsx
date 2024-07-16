import { createDirectLine, createDirectLineAppServiceExtension } from 'botframework-webchat';
import {
  createHalfDuplexChatAdapter,
  DirectLineJSBotConnection,
  TestCanvasBotStrategy,
  toDirectLineJS
} from 'copilot-studio-direct-to-engine-chat-adapter';
import { memo, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Protocol } from '../types/Protocol';
import { AppContext, AppContextType } from './private/AppContext';
import fetchJSON from './private/fetchJSON';

declare global {
  const BOT_APP_URL: string;
  const TOKEN_APP_URL: string;
}

type Props = {
  children?: ReactNode | undefined;
};

export default memo(function AppProvider({ children }: Props) {
  const [chatAdapter, setChatAdapter] = useState<DirectLineJSBotConnection | undefined>(undefined);
  const [token, setToken] = useState<string | undefined>(undefined);
  const protocolState = Object.freeze(useState<Protocol>('direct line'));

  const chatAdapterState = useMemo(() => Object.freeze(chatAdapter ? ([chatAdapter] as const) : []), [chatAdapter]);
  const tokenState = useMemo(() => Object.freeze(token ? ([token] as const) : []), [token]);

  useEffect(() => {
    const abortController = new AbortController();

    setChatAdapter(undefined);
    setToken(undefined);

    (async (protocol, signal) => {
      let token: string;

      switch (protocol) {
        case 'direct line':
          ({ token } = await fetchJSON(new URL('api/token/directline', TOKEN_APP_URL), { signal }));

          if (!signal.aborted) {
            setChatAdapter(createDirectLine({ token }) as unknown as DirectLineJSBotConnection);
            setToken(token);
          }

          break;

        case 'direct line ase':
          ({ token } = await fetchJSON(new URL('api/token/directlinease', TOKEN_APP_URL), { signal }));

          const chatAdapter = (await createDirectLineAppServiceExtension({
            domain: new URL('/.bot/v3/directline', BOT_APP_URL).toString(),
            token
          })) as unknown as DirectLineJSBotConnection;

          if (!signal.aborted) {
            setChatAdapter(chatAdapter);
            setToken(token);
          }

          break;

        case 'direct to engine':
          setChatAdapter(
            toDirectLineJS(
              createHalfDuplexChatAdapter(
                new TestCanvasBotStrategy({
                  botId: 'DUMMY',
                  environmentId: 'DUMMY',
                  async getToken() {
                    return 'DUMMY';
                  },
                  islandURI: new URL('/api/testcanvas', BOT_APP_URL),
                  transport: 'auto'
                })
              )
            )
          );

          break;

        default:
          throw new Error('To be implemented.');
      }
    })(protocolState[0], abortController.signal);

    return () => abortController.abort();
  }, [protocolState[0], setToken]);

  const context = useMemo<AppContextType>(
    () =>
      Object.freeze({
        chatAdapterState,
        protocolState,
        tokenState
      }),
    [chatAdapterState, protocolState, tokenState]
  );

  return <AppContext.Provider value={context}>{children}</AppContext.Provider>;
});
