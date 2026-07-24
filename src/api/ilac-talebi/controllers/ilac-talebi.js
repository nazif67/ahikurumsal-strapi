'use strict';

/**
 * ilac-talebi controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::ilac-talebi.ilac-talebi', ({ strapi }) => ({
  async create(ctx) {
    const { adSoyad, ilaclar } = ctx.request.body.data || ctx.request.body;

    if (!adSoyad || !ilaclar) {
      return ctx.badRequest('Ad soyad ve ilaçlar alanları zorunludur');
    }

    const entry = await strapi.entityService.create('api::ilac-talebi.ilac-talebi', {
      data: { adSoyad, ilaclar, publishedAt: new Date() },
    });

    ctx.send({ data: entry, message: 'Talebiniz iletildi' });
  },
}));
