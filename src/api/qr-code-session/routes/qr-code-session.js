'use strict';

/**
 * qr-code-session router
 */

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/qr-code-sessions/create',
      handler: 'qr-code-session.createSession',
      config: {
        policies: [],
        middlewares: []
      }
    },
    {
      method: 'GET',
      path: '/qr-code-sessions/my-sessions',
      handler: 'qr-code-session.getMySessions',
      config: {
        policies: [],
        middlewares: []
      }
    },
    {
      method: 'POST',
      path: '/qr-code-sessions/:id/deactivate',
      handler: 'qr-code-session.deactivate',
      config: {
        policies: [],
        middlewares: []
      }
    },
    {
      method: 'POST',
      path: '/qr-code-sessions/validate',
      handler: 'qr-code-session.validateSession',
      config: {
        policies: [],
        middlewares: []
      }
    }
  ]
};

