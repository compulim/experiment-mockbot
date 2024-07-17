import { createBotAsChatAdapter } from '@microsoft/botframework-mockbot-pages-bot-bundle-as-chat-adapter';
import { createDirectLine, createDirectLineAppServiceExtension } from 'botframework-webchat';
import {
  createHalfDuplexChatAdapter,
  DirectLineJSBotConnection,
  TestCanvasBotStrategy,
  toDirectLineJS
} from 'copilot-studio-direct-to-engine-chat-adapter';
import { memo, useEffect, useMemo, useState, type ReactNode } from 'react';
import { object, optional, parse, string } from 'valibot';
import { Protocol } from '../types/Protocol';
import type { WebChatAdapters } from '../types/WebChatAdapters';
import { AppContext, AppContextType } from './private/AppContext';
import fetchJSON from './private/fetchJSON';

declare global {
  const BOT_APP_URL: string;
  const TOKEN_APP_URL: string;
}

type Props = {
  children?: ReactNode | undefined;
};

const DEFAULT_BOT_APP_URL = 'http://localhost:3978';

export default memo(function AppProvider({ children }: Props) {
  const botAppURL = useMemo(() => BOT_APP_URL || DEFAULT_BOT_APP_URL, []);
  const [webChatAdapters, setWebChatAdapters] = useState<WebChatAdapters | undefined>(undefined);
  const [token, setToken] = useState<string | undefined>(undefined);
  const protocolState = Object.freeze(useState<Protocol>('direct line'));

  const webChatAdaptersState = useMemo(
    () => Object.freeze(webChatAdapters ? ([webChatAdapters] as const) : []),
    [webChatAdapters]
  );
  const tokenState = useMemo(() => Object.freeze(token ? ([token] as const) : []), [token]);

  useEffect(() => {
    const abortController = new AbortController();

    setWebChatAdapters(undefined);
    setToken(undefined);

    (async (protocol, signal) => {
      switch (protocol) {
        case 'direct line':
          {
            const { token } = await fetchJSON(new URL('api/token/directline', TOKEN_APP_URL), { signal });

            if (!signal.aborted) {
              setWebChatAdapters({ directLine: createDirectLine({ token }) as unknown as DirectLineJSBotConnection });
              setToken(token);
            }
          }

          break;

        case 'direct line ase':
          {
            const { token } = await fetchJSON(new URL('api/token/directlinease', TOKEN_APP_URL), { signal });

            const directLine = (await createDirectLineAppServiceExtension({
              domain: new URL('/.bot/v3/directline', botAppURL).toString(),
              token
            })) as unknown as DirectLineJSBotConnection;

            if (!signal.aborted) {
              setWebChatAdapters({ directLine });
              setToken(token);
            }
          }

          break;

        case 'direct line speech':
          const adapters = await (window as any).WebChat.createDirectLineSpeechAdapters({
            fetchCredentials: async () => {
              const { region, token } = parse(
                object({
                  region: optional(string(), 'westus'),
                  token: string()
                }),
                await fetchJSON(new URL('api/token/speech', TOKEN_APP_URL), { signal })
              );

              signal.aborted || setToken(token);

              return { authorizationToken: token, region };
            }
          });

          if (!signal.aborted) {
            setWebChatAdapters(adapters);
            setToken(token);
          }

          break;

        case 'direct to engine':
        case 'direct to engine rest':
          setWebChatAdapters({
            directLine: toDirectLineJS(
              createHalfDuplexChatAdapter(
                new TestCanvasBotStrategy({
                  botId: '--dummy--',
                  environmentId: '--dummy--',
                  async getToken() {
                    return 'DUMMY';
                  },
                  islandURI: new URL('.', botAppURL),
                  transport: protocol === 'direct to engine rest' ? 'rest' : 'auto'
                })
              )
            )
          });

          break;

        case 'offline':
          setWebChatAdapters({ directLine: createBotAsChatAdapter() as any });

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
        protocolState,
        tokenState,
        webChatAdaptersState
      }),
    [protocolState, tokenState, webChatAdaptersState]
  );

  return <AppContext.Provider value={context}>{children}</AppContext.Provider>;
});
