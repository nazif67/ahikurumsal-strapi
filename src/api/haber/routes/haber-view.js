'use strict';

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/haberler/:slug/view',
      handler: 'haber.view',
      config: {
        auth: false,
      },
    },
  ],
};
