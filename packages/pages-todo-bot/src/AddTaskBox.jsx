import './AddTaskBox.css';

import { useDispatch } from 'react-redux';
import React, { useCallback, useState } from 'react';
import { Add16Regular } from '@fluentui/react-icons';

import addTask from './data/action/addTask';

export default function AddTaskBox() {
  const dispatch = useDispatch();
  const [nextTaskText, setNextTaskText] = useState('');
  const handleNextTaskTextChange = useCallback(({ target: { value } }) => setNextTaskText(value), [setNextTaskText]);
  const handleSubmit = useCallback(event => {
    event.preventDefault();

    dispatch(addTask(nextTaskText));
    setNextTaskText('');
  }, [dispatch, nextTaskText, setNextTaskText]);

  return (
    <form
      className="add-task-box"
      onSubmit={handleSubmit}
    >
      <button>
        <Add16Regular />
      </button>
      <input
        autoFocus={true}
        onChange={handleNextTaskTextChange}
        type="text"
        value={nextTaskText}
      />
    </form>
  );
}
