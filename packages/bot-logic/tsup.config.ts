import { defineConfig, type Options } from 'tsup';

const BASE_OPTIONS: Options = {
  define: {
    BUILD_TIME: JSON.stringify(new Date().toISOString())
  },
  dts: true,
  format: ['esm'],
  sourcemap: true
};

export default defineConfig([
  {
    ...BASE_OPTIONS,
    entry: { index: './src/index.ts' },
    loader: {
      '.docx': 'empty',
      '.gif': 'empty',
      '.jpg': 'empty',
      '.mp3': 'empty',
      '.mp4': 'empty',
      '.png': 'empty',
      '.svg': 'empty',
      '.txt': 'empty'
    },
    onSuccess: 'touch ../bot-app/src/index.ts'
  },
  {
    ...BASE_OPTIONS,
    define: {
      WITH_ASSETS: 'true'
    },
    entry: { 'index.with-assets': './src/index.ts' },
    loader: {
      '.docx': 'base64',
      '.gif': 'base64',
      '.jpg': 'base64',
      '.mp3': 'base64',
      '.mp4': 'base64',
      '.png': 'base64',
      '.svg': 'base64',
      '.txt': 'base64'
    },
    onSuccess: 'touch ../pages-bot-bundle-as-chat-adapter/src/index.ts'
  }
]);
