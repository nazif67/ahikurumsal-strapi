'use strict';

module.exports = {
  routes: [
    {
      method: 'PUT',
      path: '/tasks/:id/status',
      handler: 'task.updateStatus',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/tasks/my-tasks',
      handler: 'task.getMyTasks',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};

