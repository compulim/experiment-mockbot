import { memo } from 'react';
import ProtocolSelector from './ProtocolSelector';
import TokenPrinter from './TokenPrinter';

export default memo(function App() {
  return (
    <p>
      <ProtocolSelector />
      <TokenPrinter />
    </p>
  );
});
