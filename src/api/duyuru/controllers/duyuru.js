'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::duyuru.duyuru', ({ strapi }) => ({
  async view(ctx) {
    const { slug } = ctx.params;
    const [entry] = await strapi.db
      .query('api::duyuru.duyuru')
      .findMany({ where: { slug, publishedAt: { $notNull: true } }, limit: 1 });

    if (!entry) return ctx.notFound();

    const updated = await strapi.db.query('api::duyuru.duyuru').update({
      where: { id: entry.id },
      data: { views: (entry.views || 0) + 1 },
    });

    ctx.body = { views: updated.views };
  },
}));
