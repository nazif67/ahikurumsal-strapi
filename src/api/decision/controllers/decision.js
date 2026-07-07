'use strict';

/**
 * decision controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::decision.decision', ({ strapi }) => ({
  /**
   * Find decisions filtered by company and optionally by institution
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

      // Get decisions for this company
      const decisions = await strapi.db.query('api::decision.decision').findMany({
        where,
        populate: ['institution', 'document'],
        orderBy: { createdAt: 'desc' }
      });

      return ctx.send({
        data: decisions
      });
    } catch (error) {
      console.error('Find decisions error:', error);
      return ctx.internalServerError('Kararlar yüklenirken bir hata oluştu: ' + error.message);
    }
  },

  /**
   * Create decision
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

      // Create decision
      const decision = await strapi.db.query('api::decision.decision').create({
        data: {
          ...data,
          company: companyProfile.id
        },
        populate: ['institution', 'document']
      });

      return ctx.send({
        data: decision
      });
    } catch (error) {
      console.error('Create decision error:', error);
      return ctx.internalServerError('Karar oluşturulurken bir hata oluştu: ' + error.message);
    }
  },

  /**
   * Find one decision by ID (with company check)
   */
  async findOne(ctx) {
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

      // Get decision for this company
      const decision = await strapi.db.query('api::decision.decision').findOne({
        where: { 
          documentId: id,
          company: companyProfile.id 
        },
        populate: ['institution', 'document']
      });

      if (!decision) {
        return ctx.notFound('Karar bulunamadı');
      }

      return ctx.send({
        data: decision
      });
    } catch (error) {
      console.error('Find one decision error:', error);
      return ctx.internalServerError('Karar yüklenirken bir hata oluştu: ' + error.message);
    }
  },

  /**
   * Update decision (with company check)
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

      // Check if decision belongs to this company
      const existingDecision = await strapi.db.query('api::decision.decision').findOne({
        where: { 
          documentId: id,
          company: companyProfile.id 
        }
      });

      if (!existingDecision) {
        return ctx.notFound('Karar bulunamadı veya erişim yetkiniz yok');
      }

      // Update decision using the integer ID
      const decision = await strapi.db.query('api::decision.decision').update({
        where: { id: existingDecision.id },
        data: data,
        populate: ['institution', 'document']
      });

      return ctx.send({
        data: decision
      });
    } catch (error) {
      console.error('Update decision error:', error);
      return ctx.internalServerError('Karar güncellenirken bir hata oluştu: ' + error.message);
    }
  },

  /**
   * Delete decision (with company check)
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

      // Check if decision belongs to this company
      const existingDecision = await strapi.db.query('api::decision.decision').findOne({
        where: { 
          documentId: id,
          company: companyProfile.id 
        }
      });

      if (!existingDecision) {
        return ctx.notFound('Karar bulunamadı veya erişim yetkiniz yok');
      }

      // Delete decision
      await strapi.db.query('api::decision.decision').delete({
        where: { documentId: id }
      });

      return ctx.send({
        data: existingDecision
      });
    } catch (error) {
      console.error('Delete decision error:', error);
      return ctx.internalServerError('Karar silinirken bir hata oluştu: ' + error.message);
    }
  }
}));






