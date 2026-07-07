'use strict';

/**
 * property router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/properties',
      handler: 'property.find',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/properties/:id',
      handler: 'property.findOne',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/properties',
      handler: 'property.create',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/properties/:id',
      handler: 'property.update',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'DELETE',
      path: '/properties/:id',
      handler: 'property.delete',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};






