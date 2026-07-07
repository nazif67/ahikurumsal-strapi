'use strict';

/**
 * purchasing controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::purchasing.purchasing', ({ strapi }) => ({
  /**
   * Find purchasings filtered by company and optionally by institution
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

      // Get purchasings for this company
      const purchasings = await strapi.db.query('api::purchasing.purchasing').findMany({
        where,
        populate: ['institution', 'invoice'],
        orderBy: { createdAt: 'desc' }
      });

      return ctx.send({
        data: purchasings
      });
    } catch (error) {
      console.error('Find purchasings error:', error);
      return ctx.internalServerError('Satın almalar yüklenirken bir hata oluştu: ' + error.message);
    }
  },

  /**
   * Find one purchasing by ID (with company check)
   */
  async findOne(ctx) {
    try {
      const user = ctx.state.user;
      const { id } = ctx.params;

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

      // Get purchasing for this company
      const purchasing = await strapi.db.query('api::purchasing.purchasing').findOne({
        where: { 
          documentId: id,
          company: companyProfile.id 
        },
        populate: ['institution', 'invoice']
      });

      if (!purchasing) {
        return ctx.notFound('Satın alma bulunamadı');
      }

      return ctx.send({
        data: purchasing
      });
    } catch (error) {
      console.error('Find one purchasing error:', error);
      return ctx.internalServerError('Satın alma yüklenirken bir hata oluştu: ' + error.message);
    }
  },

  /**
   * Create purchasing
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

      // Create purchasing
      const purchasing = await strapi.db.query('api::purchasing.purchasing').create({
        data: {
          ...data,
          company: companyProfile.id
        },
        populate: ['institution', 'invoice']
      });

      return ctx.send({
        data: purchasing
      });
    } catch (error) {
      console.error('Create purchasing error:', error);
      return ctx.internalServerError('Satın alma oluşturulurken bir hata oluştu: ' + error.message);
    }
  },

  /**
   * Update purchasing (with company check)
   */
  async update(ctx) {
    try {
      const user = ctx.state.user;
      const { id } = ctx.params;
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

      // Check if purchasing belongs to this company
      const existingPurchasing = await strapi.db.query('api::purchasing.purchasing').findOne({
        where: { 
          documentId: id,
          company: companyProfile.id 
        }
      });

      if (!existingPurchasing) {
        return ctx.notFound('Satın alma bulunamadı veya erişim yetkiniz yok');
      }

      // Update purchasing using the integer ID
      const purchasing = await strapi.db.query('api::purchasing.purchasing').update({
        where: { id: existingPurchasing.id },
        data: data,
        populate: ['institution', 'invoice']
      });

      return ctx.send({
        data: purchasing
      });
    } catch (error) {
      console.error('Update purchasing error:', error);
      return ctx.internalServerError('Satın alma güncellenirken bir hata oluştu: ' + error.message);
    }
  },

  /**
   * Delete purchasing (with company check)
   */
  async delete(ctx) {
    try {
      const user = ctx.state.user;
      const { id } = ctx.params;

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

      // Check if purchasing belongs to this company
      const existingPurchasing = await strapi.db.query('api::purchasing.purchasing').findOne({
        where: { 
          documentId: id,
          company: companyProfile.id 
        }
      });

      if (!existingPurchasing) {
        return ctx.notFound('Satın alma bulunamadı veya erişim yetkiniz yok');
      }

      // Delete purchasing
      await strapi.db.query('api::purchasing.purchasing').delete({
        where: { documentId: id }
      });

      return ctx.send({
        data: existingPurchasing
      });
    } catch (error) {
      console.error('Delete purchasing error:', error);
      return ctx.internalServerError('Satın alma silinirken bir hata oluştu: ' + error.message);
    }
  }
}));


