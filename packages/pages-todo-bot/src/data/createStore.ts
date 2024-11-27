import { applyMiddleware, createStore } from 'redux';
import createSagaMiddleware from 'redux-saga';

// @ts-ignore
import reducer from './reducer';
// @ts-ignore
import saga from './saga';

export default () => {
  const sagaMiddleware = createSagaMiddleware();

  const store = createStore(
    reducer,
    {},
    applyMiddleware(
      sagaMiddleware
    )
  );

  sagaMiddleware.run(saga);

  return store;
}
