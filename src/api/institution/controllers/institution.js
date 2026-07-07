'use strict';

/**
 * institution controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::institution.institution', ({ strapi }) => ({
  /**
   * Find institutions filtered by company
   */
  async find(ctx) {
    try {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('Giriş yapmalısınız');
      }

      // Find company profile for user
      const companyProfile = await strapi.db.query('api::company-profile.company-profile').findOne({
        where: { owner: user.id }
      });

      if (!companyProfile) {
        return ctx.notFound('Şirket profili bulunamadı');
      }

      // Get institutions for this company
      const institutions = await strapi.db.query('api::institution.institution').findMany({
        where: { company: companyProfile.id },
        populate: [
          'activityReport', 
          'foundationDeed', 
          'internalAuditReports', 
          'signatureCircular'
        ],
        orderBy: { createdAt: 'desc' }
      });

      return ctx.send({
        data: institutions
      });
    } catch (error) {
      console.error('Find institutions error:', error);
      return ctx.internalServerError('Kurumlar yüklenirken bir hata oluştu: ' + error.message);
    }
  },

  /**
   * Create institution
   */
  async create(ctx) {
    try {
      const user = ctx.state.user;
      const { data } = ctx.request.body;

      if (!user) {
        return ctx.unauthorized('Giriş yapmalısınız');
      }

      // Find company profile
      const companyProfile = await strapi.db.query('api::company-profile.company-profile').findOne({
        where: { owner: user.id }
      });

      if (!companyProfile) {
        return ctx.notFound('Şirket profili bulunamadı');
      }

      // Create institution
      const institution = await strapi.db.query('api::institution.institution').create({
        data: {
          ...data,
          company: companyProfile.id
        },
        populate: [
          'activityReport', 
          'foundationDeed', 
          'internalAuditReports', 
          'signatureCircular'
        ]
      });

      return ctx.send({
        data: institution
      });
    } catch (error) {
      console.error('Create institution error:', error);
      return ctx.internalServerError('Kurum oluşturulurken bir hata oluştu: ' + error.message);
    }
  }
}));






