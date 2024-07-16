import alias from '@rollup/plugin-alias';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import { resolve as pathResolve } from 'path';

export default {
  input: 'src/index.ts',
  output: {
    file: 'dist/index.js',
    format: 'cjs',
    sourcemap: true
  },
  plugins: [
    alias({
      entries: [
        { find: 'math-random', replacement: pathResolve('../../node_modules/math-random/browser/index.js') },
        { find: 'child_process', replacement: pathResolve('./esbuild/child_process-mock.cjs') },
        { find: 'fs', replacement: pathResolve('./esbuild/fs-mock.cjs') },
        { find: 'net', replacement: pathResolve('./esbuild/net-mock.cjs') },
        { find: 'tls', replacement: pathResolve('./esbuild/tls-mock.cjs') },

        { find: 'constants', replacement: pathResolve('../../node_modules/constants') },
        { find: 'crypto', replacement: pathResolve('../../node_modules/crypto') },
        { find: 'http', replacement: pathResolve('../../node_modules/http') },
        { find: 'https', replacement: pathResolve('../../node_modules/https') },
        { find: 'os', replacement: pathResolve('../../node_modules/os') },
        { find: 'path', replacement: pathResolve('../../node_modules/path') },
        { find: 'stream', replacement: pathResolve('../../node_modules/stream') },
        { find: 'timers', replacement: pathResolve('../../node_modules/timers') },

        { find: 'node:http', replacement: pathResolve('../../node_modules/http') },
        { find: 'node:https', replacement: pathResolve('../../node_modules/https') },
        { find: 'node:stream', replacement: pathResolve('../../node_modules/stream') }
      ]
    }),
    resolve({
      browser: true,
      // modulesOnly: true,
      preferBuiltins: false
    }),
    commonjs(),
    typescript({
      allowSyntheticDefaultImports: true,
      target: 'ESNext'
    }),
    json()
  ],
  external: []
};
