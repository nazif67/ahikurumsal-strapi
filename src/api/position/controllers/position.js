'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController(
  "api::position.position",
  ({ strapi }) => ({
    async find(ctx) {
      const results = await strapi.db.query("api::position.position").findMany({
        where: ctx.query.filters || {},
        populate: true,
      });
      return { data: results };
    },
  })
);
