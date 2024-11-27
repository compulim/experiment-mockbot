import './Checkbox.css';

import { CheckboxChecked24Regular, CheckboxUnchecked24Regular } from '@fluentui/react-icons';
import classNames from 'classnames';
import React, { useCallback } from 'react';

export default function Checkbox({ checked, disabled, onChange }) {
  const handleChange = useCallback(({ target: { checked } }) => onChange(checked), [onChange]);

  return (
    <span className={classNames('checkbox', { disabled })}>
      {checked ? <CheckboxChecked24Regular className="icon" /> : <CheckboxUnchecked24Regular className="icon" />}
      <input checked={checked || false} disabled={disabled} onChange={handleChange} type="checkbox" />
    </span>
  );
}
