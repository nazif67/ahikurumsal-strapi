'use strict';

/**
 * ilac-talebi controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::ilac-talebi.ilac-talebi', ({ strapi }) => ({
  async create(ctx) {
    const { adSoyad, ilaclar, hekimRaporu } = ctx.request.body.data || ctx.request.body;

    if (!adSoyad || !Array.isArray(ilaclar) || ilaclar.length === 0 || !hekimRaporu) {
      return ctx.badRequest('Ad soyad, en az bir ilaç ve hekim raporu alanları zorunludur');
    }

    const ilaclarGecerli = ilaclar.every(
      (item) =>
        item &&
        typeof item.ilacAdi === 'string' &&
        item.ilacAdi.trim() &&
        typeof item.mg === 'string' &&
        item.mg.trim()
    );

    if (!ilaclarGecerli) {
      return ctx.badRequest('Her ilaç için ad ve mg bilgisi girilmelidir');
    }

    if (!['var', 'yok'].includes(hekimRaporu)) {
      return ctx.badRequest('Hekim raporu alanı "var" veya "yok" olmalıdır');
    }

    const entry = await strapi.entityService.create('api::ilac-talebi.ilac-talebi', {
      data: { adSoyad, ilaclar, hekimRaporu, publishedAt: new Date() },
    });

    ctx.send({ data: entry, message: 'Talebiniz iletildi' });
  },
}));
