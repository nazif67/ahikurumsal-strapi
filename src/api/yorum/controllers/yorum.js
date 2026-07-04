'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::yorum.yorum', ({ strapi }) => ({
  async find(ctx) {
    ctx.query = {
      ...ctx.query,
      filters: {
        ...(ctx.query.filters || {}),
        approved: { $eq: true },
      },
    };
    return await super.find(ctx);
  },
}));
