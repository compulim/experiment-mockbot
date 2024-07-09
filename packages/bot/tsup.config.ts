import { defineConfig } from 'tsup';

export default defineConfig([
  {
    define: {
      BUILD_TIME: JSON.stringify(new Date().toISOString())
    },
    entry: { index: './src/index.ts' },
    format: ['cjs'],
    noExternal: [/./], // Bundle everything
    sourcemap: true
  }
]);
