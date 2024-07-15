import { createRoot } from 'react-dom/client';

const main = document.querySelector('main');

main && createRoot(main).render(<h1>Hello, World!</h1>);
