'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/leave-requests/my-requests',
      handler: 'leave-request.getMyRequests',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/leave-requests/my-remaining-days',
      handler: 'leave-request.getMyRemainingDays',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/leave-requests/:id/approve',
      handler: 'leave-request.approve',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/leave-requests/:id/reject',
      handler: 'leave-request.reject',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/leave-requests/worker/:workerId/remaining-days',
      handler: 'leave-request.getRemainingDays',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'DELETE',
      path: '/leave-requests/:id',
      handler: 'leave-request.delete',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};

