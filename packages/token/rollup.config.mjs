import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import resolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import typescript from '@rollup/plugin-typescript';

export default {
  input: 'src/index.ts',
  output: {
    file: 'dist/index.js',
    format: 'cjs',
    sourcemap: true
  },
  plugins: [
    replace({
      preventAssignment: true,
      values: {
        BUILD_TIME: JSON.stringify(new Date().toISOString())
      }
    }),
    resolve({
      preferBuiltins: true
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
