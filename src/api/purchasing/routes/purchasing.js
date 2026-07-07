'use strict';

/**
 * purchasing router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/purchasings',
      handler: 'purchasing.find',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/purchasings/:id',
      handler: 'purchasing.findOne',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/purchasings',
      handler: 'purchasing.create',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/purchasings/:id',
      handler: 'purchasing.update',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'DELETE',
      path: '/purchasings/:id',
      handler: 'purchasing.delete',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};


