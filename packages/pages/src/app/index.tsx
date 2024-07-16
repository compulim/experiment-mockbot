import { createRoot } from 'react-dom/client';
import App from './App';
import AppProvider from './data/AppProvider';

const main = document.querySelector('main');

main &&
  createRoot(main).render(
    <AppProvider>
      <App />
    </AppProvider>
  );
