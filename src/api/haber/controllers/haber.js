'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::haber.haber', ({ strapi }) => ({
  async view(ctx) {
    const { slug } = ctx.params;
    const [entry] = await strapi.db
      .query('api::haber.haber')
      .findMany({ where: { slug }, limit: 1 });

    if (!entry) return ctx.notFound();

    const updated = await strapi.db.query('api::haber.haber').update({
      where: { id: entry.id },
      data: { views: (entry.views || 0) + 1 },
    });

    ctx.body = { views: updated.views };
  },
}));
