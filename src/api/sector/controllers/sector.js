'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController(
  "api::sector.sector",
  ({ strapi }) => ({
    async find(ctx) {
      const { user } = ctx.state;

      if (user?.role?.name === "Employee") {
        const results = await strapi.db.query("api::sector.sector").findMany({
          where: ctx.query.filters || {},
          populate: true,
        });
        return { data: results };
      }

      const relatedCompanies = await strapi.db
        .query("api::company-profile.company-profile")
        .findMany({
          where: {},
          populate: ["sector"],
        });

      const sectorIds = [
        ...new Set(
          relatedCompanies.map((company) => company.sector?.id).filter(Boolean)
        ),
      ];

      const sectors = await strapi.db.query("api::sector.sector").findMany({
        where: { id: { $in: sectorIds } },
      });

      ctx.body = { data: sectors };
    },
  })
);
