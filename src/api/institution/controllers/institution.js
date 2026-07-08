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
  },

  // findOne/update/delete core handler'a düşüyordu ve şirket kontrolü yoktu —
  // decision/property/vehicle kalıbıyla aynı şekilde şirkete kapsandı

  async findOne(ctx) {
    try {
      const user = ctx.state.user;
      const { id } = ctx.params;

      if (!user) {
        return ctx.unauthorized('Giriş yapmalısınız');
      }

      const companyProfile = await strapi.db.query('api::company-profile.company-profile').findOne({
        where: { owner: user.id }
      });

      if (!companyProfile) {
        return ctx.notFound('Şirket profili bulunamadı');
      }

      const institution = await strapi.db.query('api::institution.institution').findOne({
        where: { documentId: id, company: companyProfile.id },
        populate: ['activityReport', 'foundationDeed', 'internalAuditReports', 'signatureCircular']
      });

      if (!institution) {
        return ctx.notFound('Kurum bulunamadı');
      }

      return ctx.send({ data: institution });
    } catch (error) {
      console.error('Find one institution error:', error);
      return ctx.internalServerError('Kurum yüklenirken bir hata oluştu: ' + error.message);
    }
  },

  async update(ctx) {
    try {
      const user = ctx.state.user;
      const { id } = ctx.params;
      const { data } = ctx.request.body;

      if (!user) {
        return ctx.unauthorized('Giriş yapmalısınız');
      }

      const companyProfile = await strapi.db.query('api::company-profile.company-profile').findOne({
        where: { owner: user.id }
      });

      if (!companyProfile) {
        return ctx.notFound('Şirket profili bulunamadı');
      }

      const existing = await strapi.db.query('api::institution.institution').findOne({
        where: { documentId: id, company: companyProfile.id }
      });

      if (!existing) {
        return ctx.notFound('Kurum bulunamadı veya erişim yetkiniz yok');
      }

      const { company, ...safeData } = data || {};

      const institution = await strapi.db.query('api::institution.institution').update({
        where: { id: existing.id },
        data: safeData,
        populate: ['activityReport', 'foundationDeed', 'internalAuditReports', 'signatureCircular']
      });

      return ctx.send({ data: institution });
    } catch (error) {
      console.error('Update institution error:', error);
      return ctx.internalServerError('Kurum güncellenirken bir hata oluştu: ' + error.message);
    }
  },

  async delete(ctx) {
    try {
      const user = ctx.state.user;
      const { id } = ctx.params;

      if (!user) {
        return ctx.unauthorized('Giriş yapmalısınız');
      }

      const companyProfile = await strapi.db.query('api::company-profile.company-profile').findOne({
        where: { owner: user.id }
      });

      if (!companyProfile) {
        return ctx.notFound('Şirket profili bulunamadı');
      }

      const existing = await strapi.db.query('api::institution.institution').findOne({
        where: { documentId: id, company: companyProfile.id }
      });

      if (!existing) {
        return ctx.notFound('Kurum bulunamadı veya erişim yetkiniz yok');
      }

      await strapi.db.query('api::institution.institution').delete({
        where: { id: existing.id }
      });

      return ctx.send({ data: existing });
    } catch (error) {
      console.error('Delete institution error:', error);
      return ctx.internalServerError('Kurum silinirken bir hata oluştu: ' + error.message);
    }
  }
}));






