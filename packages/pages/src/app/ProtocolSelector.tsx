import { Fragment, memo, useCallback, type FormEventHandler } from 'react';
import { parse } from 'valibot';
import useProtocol from './data/useProtocol';
import { protocolSchema } from './types/Protocol';

export default memo(function ProtocolSelector() {
  const [protocol, setProtocol] = useProtocol();

  const handleChange = useCallback<FormEventHandler<HTMLInputElement>>(
    ({ currentTarget: { value } }) => setProtocol(parse(protocolSchema(), value)),
    [setProtocol]
  );

  return (
    <Fragment>
      <div>
        <label>
          <input checked={protocol === 'direct line'} onChange={handleChange} type="radio" value="direct line" />
          Direct Line
        </label>
      </div>
      <div>
        <label>
          <input
            checked={protocol === 'direct line ase'}
            onChange={handleChange}
            type="radio"
            value="direct line ase"
          />
          Direct Line ASE
        </label>
      </div>
      <div>
        <label>
          <input
            checked={protocol === 'direct line speech'}
            onChange={handleChange}
            type="radio"
            value="direct line speech"
          />
          Direct Line Speech
        </label>
      </div>
      <div>
        <label>
          <input
            checked={protocol === 'direct to engine'}
            onChange={handleChange}
            type="radio"
            value="direct to engine"
          />
          Direct-to-Engine (experimental)
        </label>
      </div>
    </Fragment>
  );
});
