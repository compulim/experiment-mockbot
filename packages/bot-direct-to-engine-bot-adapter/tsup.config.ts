import { defineConfig } from 'tsup';

export default defineConfig([
  {
    define: {
      BUILD_TIME: JSON.stringify(new Date().toISOString())
    },
    dts: true,
    entry: { index: './src/index.ts' },
    format: ['esm'],
    onSuccess: 'touch ../echo-bot-app/src/index.ts ../mock-bot-app/src/index.ts',
    sourcemap: true
  }
]);
