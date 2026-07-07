'use strict';

/**
 * decision router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/decisions',
      handler: 'decision.find',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/decisions/:id',
      handler: 'decision.findOne',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/decisions',
      handler: 'decision.create',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/decisions/:id',
      handler: 'decision.update',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'DELETE',
      path: '/decisions/:id',
      handler: 'decision.delete',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};






