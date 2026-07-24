'use strict';

/**
 * ilac-talebi controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::ilac-talebi.ilac-talebi', ({ strapi }) => ({
  async create(ctx) {
    const { adSoyad, ilaclar, mgBilgisi, hekimRaporu } = ctx.request.body.data || ctx.request.body;

    if (!adSoyad || !ilaclar || !mgBilgisi || !hekimRaporu) {
      return ctx.badRequest('Ad soyad, ilaçlar, mg bilgisi ve hekim raporu alanları zorunludur');
    }

    if (!['var', 'yok'].includes(hekimRaporu)) {
      return ctx.badRequest('Hekim raporu alanı "var" veya "yok" olmalıdır');
    }

    const entry = await strapi.entityService.create('api::ilac-talebi.ilac-talebi', {
      data: { adSoyad, ilaclar, mgBilgisi, hekimRaporu, publishedAt: new Date() },
    });

    ctx.send({ data: entry, message: 'Talebiniz iletildi' });
  },
}));
