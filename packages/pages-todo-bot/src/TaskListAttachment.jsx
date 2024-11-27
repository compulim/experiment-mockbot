import './TaskListAttachment.css';

import { useDispatch, useSelector } from 'react-redux';
import classNames from 'classnames';
import React, { useCallback } from 'react';

import markTaskAsCompleted from './data/action/markTaskAsCompleted';
import markTaskAsIncompleted from './data/action/markTaskAsIncompleted';

const TaskListItem = ({ taskId }) => {
  const task = useSelector(({ tasks }) => tasks.find(({ id }) => id === taskId));
  const dispatch = useDispatch();
  const handleChange = useCallback(() => {
    if (task.completed) {
      dispatch(markTaskAsIncompleted(task.id));
    } else {
      dispatch(markTaskAsCompleted(task.id));
    }
  }, [dispatch, task]);

  if (!task) {
    return false;
  }

  const { completed, text } = task;

  return (
    <label className="task-list-item">
      <input checked={completed || false} onChange={handleChange} type="checkbox" />
      <span className={classNames({ completed })}>{text}</span>
    </label>
  );
};

const TaskListAttachment = () => {
  const tasks = useSelector(({ tasks }) => tasks);

  return (
    <div className="task-list-attachment">
      <ul>
        {tasks.map(({ id }) => (
          <li key={id}>
            <TaskListItem taskId={id} />
          </li>
        ))}
      </ul>
      <footer>(You can tick the checkbox to complete tasks.)</footer>
      <div className="badge">LIVE</div>
    </div>
  );
};

export default TaskListAttachment;
