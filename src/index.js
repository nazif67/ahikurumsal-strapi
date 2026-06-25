'use strict';

module.exports = {
  register() {},

  async bootstrap({ strapi }) {
    // Public rol için okuma izinlerini otomatik ayarla
    const publicRole = await strapi.db
      .query('plugin::users-permissions.role')
      .findOne({ where: { type: 'public' } });

    if (!publicRole) return;

    const publicActions = [
      'api::blog.blog.find',
      'api::blog.blog.findOne',
      'api::haber.haber.find',
      'api::haber.haber.findOne',
      'api::duyuru.duyuru.find',
      'api::duyuru.duyuru.findOne',
      'api::hakkimda.hakkimda.find',
      'plugin::upload.content-api.find',
      'plugin::upload.content-api.findOne',
    ];

    for (const action of publicActions) {
      const existing = await strapi.db
        .query('plugin::users-permissions.permission')
        .findOne({ where: { action, role: publicRole.id } });

      if (!existing) {
        await strapi.db
          .query('plugin::users-permissions.permission')
          .create({ data: { action, role: publicRole.id, enabled: true } });
      } else if (!existing.enabled) {
        await strapi.db
          .query('plugin::users-permissions.permission')
          .update({ where: { id: existing.id }, data: { enabled: true } });
      }
    }
  },
};
