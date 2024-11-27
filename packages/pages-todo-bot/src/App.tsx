import './App.css';

import React from 'react';

// import AddTaskBox from './AddTaskBox';
// @ts-ignore
import Tasks from './Tasks';
// @ts-ignore
import WebChat from './WebChat';

export default function App() {
  return (
    <div className="app">
      <div className="task-list">
        <Tasks className="tasks" />
        {/* <AddTaskBox /> */}
      </div>
      <WebChat />
    </div>
  );
}
