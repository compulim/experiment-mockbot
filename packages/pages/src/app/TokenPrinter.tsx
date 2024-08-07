import { memo } from 'react';
import useToken from './data/useToken';

export default memo(function TokenPrinter() {
  const [token] = useToken();

  return token ? <div>Token is {(token || '').substring(0, 10)}&hellip;</div> : <div>Generating token&hellip;</div>;
});
