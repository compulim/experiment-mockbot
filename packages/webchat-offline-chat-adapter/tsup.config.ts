import { defineConfig } from 'tsup';

export default defineConfig([
  {
    bundle: true,
    define: {
      BUILD_TIME: JSON.stringify(new Date().toISOString())
    },
    dts: true,
    entry: { index: './src/index.ts' },
    format: ['esm'],
    onSuccess: 'touch ../pages-bot-bundle-as-chat-adapter/src/index.ts',
    sourcemap: true
  }
]);
