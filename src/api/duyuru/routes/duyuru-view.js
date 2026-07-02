'use strict';

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/duyurular/:slug/view',
      handler: 'duyuru.view',
      config: {
        auth: false,
      },
    },
  ],
};
