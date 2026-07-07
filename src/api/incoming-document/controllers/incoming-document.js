'use strict';

/**
 * incoming-document controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::incoming-document.incoming-document', ({ strapi }) => ({
  /**
   * Find incoming documents filtered by company and optionally by institution
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

      // Get incoming documents for this company
      const incomingDocuments = await strapi.db.query('api::incoming-document.incoming-document').findMany({
        where,
        populate: ['institution', 'document'],
        orderBy: { createdAt: 'desc' }
      });

      return ctx.send({
        data: incomingDocuments
      });
    } catch (error) {
      console.error('Find incoming documents error:', error);
      return ctx.internalServerError('Gelen evraklar yüklenirken bir hata oluştu: ' + error.message);
    }
  },

  /**
   * Create incoming document
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

      // Create incoming document
      const incomingDocument = await strapi.db.query('api::incoming-document.incoming-document').create({
        data: {
          ...data,
          company: companyProfile.id
        },
        populate: ['institution', 'document']
      });

      return ctx.send({
        data: incomingDocument
      });
    } catch (error) {
      console.error('Create incoming document error:', error);
      return ctx.internalServerError('Gelen evrak oluşturulurken bir hata oluştu: ' + error.message);
    }
  },

  /**
   * Find one incoming document by ID (with company check)
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

      const incomingDocument = await strapi.db.query('api::incoming-document.incoming-document').findOne({
        where: { 
          documentId: id,
          company: companyProfile.id 
        },
        populate: ['institution', 'document']
      });

      if (!incomingDocument) {
        return ctx.notFound('Gelen evrak bulunamadı');
      }

      return ctx.send({
        data: incomingDocument
      });
    } catch (error) {
      console.error('Find one incoming document error:', error);
      return ctx.internalServerError('Gelen evrak yüklenirken bir hata oluştu: ' + error.message);
    }
  },

  /**
   * Update incoming document (with company check)
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

      const existing = await strapi.db.query('api::incoming-document.incoming-document').findOne({
        where: { 
          documentId: id,
          company: companyProfile.id 
        }
      });

      if (!existing) {
        return ctx.notFound('Gelen evrak bulunamadı veya erişim yetkiniz yok');
      }

      const incomingDocument = await strapi.db.query('api::incoming-document.incoming-document').update({
        where: { id: existing.id },
        data: data,
        populate: ['institution', 'document']
      });

      return ctx.send({
        data: incomingDocument
      });
    } catch (error) {
      console.error('Update incoming document error:', error);
      return ctx.internalServerError('Gelen evrak güncellenirken bir hata oluştu: ' + error.message);
    }
  },

  /**
   * Delete incoming document (with company check)
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

      const existing = await strapi.db.query('api::incoming-document.incoming-document').findOne({
        where: { 
          documentId: id,
          company: companyProfile.id 
        }
      });

      if (!existing) {
        return ctx.notFound('Gelen evrak bulunamadı veya erişim yetkiniz yok');
      }

      await strapi.db.query('api::incoming-document.incoming-document').delete({
        where: { documentId: id }
      });

      return ctx.send({
        data: existing
      });
    } catch (error) {
      console.error('Delete incoming document error:', error);
      return ctx.internalServerError('Gelen evrak silinirken bir hata oluştu: ' + error.message);
    }
  }
}));






