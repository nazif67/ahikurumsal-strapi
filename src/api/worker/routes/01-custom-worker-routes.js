'use strict';

/**
 * Custom worker routes for document management
 */

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/workers/:id/generate-token',
      handler: 'worker.generateToken',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/workers/by-token/:token',
      handler: 'worker.getByToken',
      config: {
        auth: false, // Public route
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/workers/upload-document',
      handler: 'worker.uploadDocument',
      config: {
        auth: false, // Public route - token validation inside controller
        policies: [],
        middlewares: [], // Rate limiting kaldırıldı
      },
    },
    {
      method: 'GET',
      path: '/workers/company-workers',
      handler: 'worker.getCompanyWorkers',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/workers/:id/calculate-severance',
      handler: 'worker.calculateSeverance',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/workers/bulk-import',
      handler: 'worker.bulkImport',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/workers/:workerId/document/:documentType/delete',
      handler: 'worker.deleteDocument',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};

