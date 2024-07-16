import { defineConfig } from 'tsup';

export default defineConfig([
  {
    define: {
      BUILD_TIME: JSON.stringify(new Date().toISOString())
    },
    dts: true,
    entry: { index: './src/index.ts' },
    format: ['esm'],
    sourcemap: true
  }
]);
