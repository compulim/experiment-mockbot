import { memo } from 'react';
import useToken from './data/useToken';

export default memo(function TokenPrinter() {
  const [token] = useToken();

  return <div>Token is {token}.</div>;
});
