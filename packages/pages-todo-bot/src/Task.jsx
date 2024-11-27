import './Task.css';

import { Delete24Regular } from '@fluentui/react-icons';
import { useDispatch, useSelector } from 'react-redux';
import classNames from 'classnames';
import React, { useCallback } from 'react';

import Checkbox from './Checkbox';

import addTask from './data/action/addTask';
import deleteTask from './data/action/deleteTask';
import editTaskText from './data/action/editTaskText';
import markTaskAsCompleted from './data/action/markTaskAsCompleted';
import markTaskAsIncompleted from './data/action/markTaskAsIncompleted';

export default function Task({ taskId }) {
  const task = useSelector(({ tasks }) => tasks.find(({ id }) => id === taskId));
  const dispatch = useDispatch();

  const handleCompletedChange = useCallback(
    checked => {
      dispatch(checked ? markTaskAsCompleted(taskId) : markTaskAsIncompleted(taskId));
    },
    [dispatch, taskId]
  );

  const handleDeleteClick = useCallback(() => {
    dispatch(deleteTask(taskId));
  }, [dispatch, taskId]);

  const handleTextChange = useCallback(
    ({ target: { value } }) => {
      if (!task) {
        dispatch(addTask(taskId, value));
      } else if (value) {
        dispatch(editTaskText(taskId, value));
      } else {
        dispatch(deleteTask(taskId));
      }
    },
    [dispatch, task, taskId]
  );

  const { completed = false } = task || {};

  return (
    <div className="task">
      <Checkbox checked={completed} disabled={!task} onChange={handleCompletedChange} />
      <input
        className={classNames('text', { completed })}
        onChange={handleTextChange}
        placeholder="Type your task"
        type="text"
        value={task ? task.text : ''}
      />
      <button className="delete" disabled={!task} onClick={handleDeleteClick} type="button">
        <Delete24Regular />
      </button>
    </div>
  );
}
