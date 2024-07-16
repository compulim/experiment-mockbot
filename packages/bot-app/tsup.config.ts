import { defineConfig } from 'tsup';

export default defineConfig([
  {
    define: {
      BUILD_TIME: JSON.stringify(new Date().toISOString())
    },
    entry: { index: './src/index.ts' },
    format: ['cjs'],
    noExternal: [
      // This is ESM only and Web Apps need to run in CJS mode, so we need to bundle it in.
      '@microsoft/botframework-mockbot-bot-direct-to-engine-bot-adapter',
      // This is ESM only and Web Apps need to run in CJS mode, so we need to bundle it in.
      '@microsoft/botframework-mockbot-bot-logic'
    ],
    sourcemap: true
  }
]);
