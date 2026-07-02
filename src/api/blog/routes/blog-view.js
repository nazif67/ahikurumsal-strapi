'use strict';

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/blogs/:slug/view',
      handler: 'blog.view',
      config: {
        auth: false,
      },
    },
  ],
};
