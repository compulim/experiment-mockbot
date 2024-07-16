import { join } from 'path';
import { defineConfig } from 'tsup';
import { fileURLToPath } from 'url';

const nodeResolvePlugin = {
  name: 'browserify',
  setup(build) {
    build.onResolve({ filter: /^(child_process|fs|net|tls)$/ }, args => ({
      path: join(fileURLToPath(import.meta.url), `../esbuild/${args.path}-mock.cjs`)
    }));

    build.onResolve({ filter: /^botframework-connector$/ }, () => ({
      path: join(fileURLToPath(import.meta.url), '../../../node_modules/botframework-connector/src/index.ts')
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
    esbuildOptions(options) {
      options.keepNames = true;
    },
    esbuildPlugins: [nodeResolvePlugin],
    format: ['esm'],
    inject: ['./esbuild/global-shim.cjs'],
    external: ['fs', 'tls'],
    platform: 'browser',
    sourcemap: true
  }
]);
