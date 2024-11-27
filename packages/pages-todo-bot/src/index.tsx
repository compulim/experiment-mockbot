import { initializeIcons } from '@uifabric/icons';
import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';

import './index.css';
import App from './App';

import createStore from './data/createStore';

initializeIcons();

const rootElement = document.querySelector('main');

if (rootElement) {
  const store = createStore();

  render(
    <Provider store={store}>
      <App />
    </Provider>,
    rootElement
  );
}
