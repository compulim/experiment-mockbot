import { defineConfig } from 'tsup';

export default defineConfig([
  {
    define: {
      BUILD_TIME: JSON.stringify(new Date().toISOString())
    },
    dts: true,
    entry: { index: './src/index.ts' },
    format: ['esm'],
    loader: {
      '.docx': 'dataurl',
      '.gif': 'dataurl',
      '.jpg': 'dataurl',
      '.mp3': 'dataurl',
      '.mp4': 'dataurl',
      '.png': 'dataurl',
      '.svg': 'dataurl',
      '.txt': 'dataurl'
    },
    onSuccess: 'touch ../bot-app/src/index.ts && touch ../pages-bot-bundle-as-chat-adapter/src/index.ts',
    sourcemap: true
  }
]);
