import { createRoot } from 'react-dom/client';
import App from './App';
import AppProvider from './data/AppProvider';

declare global {
  const IS_DEVELOPMENT: boolean;
}

const main = document.querySelector('main');

main &&
  createRoot(main).render(
    <AppProvider>
      <App />
    </AppProvider>
  );

IS_DEVELOPMENT && new EventSource('/esbuild').addEventListener('change', () => location.reload());
