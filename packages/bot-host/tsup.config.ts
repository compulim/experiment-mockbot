import { defineConfig } from 'tsup';

export default defineConfig([
  {
    define: {
      BUILD_TIME: JSON.stringify(new Date().toISOString())
    },
    dts: true,
    entry: { index: './src/index.ts' },
    format: ['esm'],
    onSuccess: 'touch ../mockbot1-app/src/index.ts',
    platform: 'node',
    sourcemap: true
  }
]);
