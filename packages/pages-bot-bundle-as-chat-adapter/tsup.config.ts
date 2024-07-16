import { join } from 'path';
import { defineConfig } from 'tsup';
import { fileURLToPath } from 'url';

const nodeResolvePlugin = {
  name: 'bot-builder-bundled',
  setup(build) {
    build.onResolve({ filter: /^botbuilder$/ }, () => ({
      path: join(fileURLToPath(import.meta.url), '../../external-bot-builder-bundled/dist/index.js')
    }));
  }
};

export default defineConfig([
  {
    bundle: true,
    define: {
      BUILD_TIME: JSON.stringify(new Date().toISOString())
    },
    dts: true,
    entry: { index: './src/index.ts' },
    esbuildPlugins: [nodeResolvePlugin],
    format: ['esm'],
    platform: 'browser',
    sourcemap: true
  }
]);
