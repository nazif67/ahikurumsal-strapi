'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::blog.blog', ({ strapi }) => ({
  async view(ctx) {
    const { slug } = ctx.params;
    const [entry] = await strapi.db
      .query('api::blog.blog')
      .findMany({ where: { slug }, limit: 1 });

    if (!entry) return ctx.notFound();

    const updated = await strapi.db.query('api::blog.blog').update({
      where: { id: entry.id },
      data: { views: (entry.views || 0) + 1 },
    });

    ctx.body = { views: updated.views };
  },
}));
