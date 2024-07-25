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
      '.docx': 'base64',
      '.gif': 'base64',
      '.jpg': 'base64',
      '.mp3': 'base64',
      '.mp4': 'base64',
      '.png': 'base64',
      '.svg': 'base64',
      '.txt': 'base64'
    },
    onSuccess: 'touch ../bot-app/src/index.ts && touch ../pages-bot-bundle-as-chat-adapter/src/index.ts',
    sourcemap: true
  }
]);
