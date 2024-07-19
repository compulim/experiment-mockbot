import { join } from 'path';
import { defineConfig } from 'tsup';
import { fileURLToPath } from 'url';

const nodeResolvePlugin = {
  name: 'browserify',
  setup(build) {
    build.onResolve({ filter: /^(child_process|fs|net|tls)$/ }, args => ({
      path: join(fileURLToPath(import.meta.url), `../esbuild/${args.path}-mock.cjs`)
    }));

    build.onResolve({ filter: /^@microsoft\/recognizers-text-suite$/ }, () => ({
      // TODO: Consider use read-pkg up or other mechanisms.
      path: join(
        fileURLToPath(import.meta.url),
        '../../../node_modules/@microsoft/recognizers-text-suite/dist/recognizers-text-suite.es5.js'
      )
    }));

    build.onResolve({ filter: /^botframework-connector$/ }, () => ({
      // TODO: Consider use read-pkg up or other mechanisms.
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
      options.alias = {
        'node:http': 'http',
        'node:https': 'https',
        'node:os': 'os',
        'node:process': 'process',
        'node:stream': 'stream',
        'node:util': 'util',
        'node:zlib': 'zlib'
      };

      options.keepNames = true;
    },
    esbuildPlugins: [nodeResolvePlugin],
    format: ['esm'],
    inject: ['./esbuild/global-shim.cjs'],
    noExternal: [
      'child_process',
      'fs',
      'net',
      'tls',
      // ---
      'buffer',
      'crypto',
      'util',
      'stream',
      'http',
      'https',
      'assert',
      'url',
      'constants',
      'path',
      'os',
      'string_decoder',
      'vm'
    ],
    platform: 'browser',
    onSuccess: 'touch ../pages-bot-bundle-as-chat-adapter/src/index.ts',
    sourcemap: true
  }
]);
