'use strict';

/**
 * outgoing-document controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::outgoing-document.outgoing-document', ({ strapi }) => ({
  /**
   * Find outgoing documents filtered by company and optionally by institution
   */
  async find(ctx) {
    try {
      const user = ctx.state.user;
      const { institutionId } = ctx.query;

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

      // Build query
      const where = { company: companyProfile.id };
      
      // Add institution filter if provided
      if (institutionId) {
        where.institution = institutionId;
      }

      // Get outgoing documents for this company
      const outgoingDocuments = await strapi.db.query('api::outgoing-document.outgoing-document').findMany({
        where,
        populate: ['institution', 'document'],
        orderBy: { createdAt: 'desc' }
      });

      return ctx.send({
        data: outgoingDocuments
      });
    } catch (error) {
      console.error('Find outgoing documents error:', error);
      return ctx.internalServerError('Giden evraklar yüklenirken bir hata oluştu: ' + error.message);
    }
  },

  /**
   * Create outgoing document
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

      // Create outgoing document
      const outgoingDocument = await strapi.db.query('api::outgoing-document.outgoing-document').create({
        data: {
          ...data,
          company: companyProfile.id
        },
        populate: ['institution', 'document']
      });

      return ctx.send({
        data: outgoingDocument
      });
    } catch (error) {
      console.error('Create outgoing document error:', error);
      return ctx.internalServerError('Giden evrak oluşturulurken bir hata oluştu: ' + error.message);
    }
  },

  /**
   * Find one outgoing document by ID (with company check)
   */
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

      const outgoingDocument = await strapi.db.query('api::outgoing-document.outgoing-document').findOne({
        where: { 
          documentId: id,
          company: companyProfile.id 
        },
        populate: ['institution', 'document']
      });

      if (!outgoingDocument) {
        return ctx.notFound('Giden evrak bulunamadı');
      }

      return ctx.send({
        data: outgoingDocument
      });
    } catch (error) {
      console.error('Find one outgoing document error:', error);
      return ctx.internalServerError('Giden evrak yüklenirken bir hata oluştu: ' + error.message);
    }
  },

  /**
   * Update outgoing document (with company check)
   */
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

      const existing = await strapi.db.query('api::outgoing-document.outgoing-document').findOne({
        where: { 
          documentId: id,
          company: companyProfile.id 
        }
      });

      if (!existing) {
        return ctx.notFound('Giden evrak bulunamadı veya erişim yetkiniz yok');
      }

      const outgoingDocument = await strapi.db.query('api::outgoing-document.outgoing-document').update({
        where: { id: existing.id },
        data: data,
        populate: ['institution', 'document']
      });

      return ctx.send({
        data: outgoingDocument
      });
    } catch (error) {
      console.error('Update outgoing document error:', error);
      return ctx.internalServerError('Giden evrak güncellenirken bir hata oluştu: ' + error.message);
    }
  },

  /**
   * Delete outgoing document (with company check)
   */
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

      const existing = await strapi.db.query('api::outgoing-document.outgoing-document').findOne({
        where: { 
          documentId: id,
          company: companyProfile.id 
        }
      });

      if (!existing) {
        return ctx.notFound('Giden evrak bulunamadı veya erişim yetkiniz yok');
      }

      await strapi.db.query('api::outgoing-document.outgoing-document').delete({
        where: { documentId: id }
      });

      return ctx.send({
        data: existing
      });
    } catch (error) {
      console.error('Delete outgoing document error:', error);
      return ctx.internalServerError('Giden evrak silinirken bir hata oluştu: ' + error.message);
    }
  }
}));






