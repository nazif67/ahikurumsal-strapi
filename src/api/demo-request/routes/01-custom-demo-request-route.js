'use strict';

/**
 * Custom demo-request routes
 */

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/demo-requests/submit',
      handler: 'demo-request.create',
      config: {
        auth: false, // Allow public access for form submission
        policies: [],
        middlewares: [],
      },
    },
  ],
};

