'use strict';

/**
 * property controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::property.property', ({ strapi }) => ({
  /**
   * Find properties filtered by company and optionally by institution
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

      // Get properties for this company
      const properties = await strapi.db.query('api::property.property').findMany({
        where,
        populate: ['institution', 'photo', 'daskPolicy', 'titleDeed'],
        orderBy: { createdAt: 'desc' }
      });

      return ctx.send({
        data: properties
      });
    } catch (error) {
      console.error('Find properties error:', error);
      return ctx.internalServerError('Konutlar yüklenirken bir hata oluştu: ' + error.message);
    }
  },

  /**
   * Create property
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

      // Create property
      const property = await strapi.db.query('api::property.property').create({
        data: {
          ...data,
          company: companyProfile.id
        },
        populate: ['institution', 'photo', 'daskPolicy', 'titleDeed']
      });

      return ctx.send({
        data: property
      });
    } catch (error) {
      console.error('Create property error:', error);
      return ctx.internalServerError('Konut oluşturulurken bir hata oluştu: ' + error.message);
    }
  },

  /**
   * Find one property by ID (with company check)
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

      // Get property for this company
      const property = await strapi.db.query('api::property.property').findOne({
        where: { 
          documentId: id,
          company: companyProfile.id 
        },
        populate: ['institution', 'photo', 'daskPolicy', 'titleDeed']
      });

      if (!property) {
        return ctx.notFound('Konut bulunamadı');
      }

      return ctx.send({
        data: property
      });
    } catch (error) {
      console.error('Find one property error:', error);
      return ctx.internalServerError('Konut yüklenirken bir hata oluştu: ' + error.message);
    }
  },

  /**
   * Update property (with company check)
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

      // Check if property belongs to this company
      const existingProperty = await strapi.db.query('api::property.property').findOne({
        where: { 
          documentId: id,
          company: companyProfile.id 
        }
      });

      if (!existingProperty) {
        return ctx.notFound('Konut bulunamadı veya erişim yetkiniz yok');
      }

      // Update property using the integer ID
      const property = await strapi.db.query('api::property.property').update({
        where: { id: existingProperty.id },
        data: data,
        populate: ['institution', 'photo', 'daskPolicy', 'titleDeed']
      });

      return ctx.send({
        data: property
      });
    } catch (error) {
      console.error('Update property error:', error);
      return ctx.internalServerError('Konut güncellenirken bir hata oluştu: ' + error.message);
    }
  },

  /**
   * Delete property (with company check)
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

      // Check if property belongs to this company
      const existingProperty = await strapi.db.query('api::property.property').findOne({
        where: { 
          documentId: id,
          company: companyProfile.id 
        }
      });

      if (!existingProperty) {
        return ctx.notFound('Konut bulunamadı veya erişim yetkiniz yok');
      }

      // Delete property
      await strapi.db.query('api::property.property').delete({
        where: { documentId: id }
      });

      return ctx.send({
        data: existingProperty
      });
    } catch (error) {
      console.error('Delete property error:', error);
      return ctx.internalServerError('Konut silinirken bir hata oluştu: ' + error.message);
    }
  }
}));






