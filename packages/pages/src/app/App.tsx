import { memo } from 'react';
import ProtocolSelector from './ProtocolSelector';
import TokenPrinter from './TokenPrinter';
import WebChat from './WebChat';

export default memo(function App() {
  return (
    <p>
      <ProtocolSelector />
      <TokenPrinter />
      <WebChat />
    </p>
  );
});
