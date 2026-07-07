'use strict';

/**
 * vehicle controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::vehicle.vehicle', ({ strapi }) => ({
  /**
   * Find vehicles filtered by company and optionally by institution
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

      // Get vehicles for this company
      const vehicles = await strapi.db.query('api::vehicle.vehicle').findMany({
        where,
        populate: ['institution', 'photo'],
        orderBy: { createdAt: 'desc' }
      });

      return ctx.send({
        data: vehicles
      });
    } catch (error) {
      console.error('Find vehicles error:', error);
      return ctx.internalServerError('Araçlar yüklenirken bir hata oluştu: ' + error.message);
    }
  },

  /**
   * Create vehicle
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

      // Create vehicle
      const vehicle = await strapi.db.query('api::vehicle.vehicle').create({
        data: {
          ...data,
          company: companyProfile.id
        },
        populate: ['institution', 'photo']
      });

      return ctx.send({
        data: vehicle
      });
    } catch (error) {
      console.error('Create vehicle error:', error);
      return ctx.internalServerError('Araç oluşturulurken bir hata oluştu: ' + error.message);
    }
  },

  /**
   * Find one vehicle by ID (with company check)
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

      // Get vehicle for this company
      const vehicle = await strapi.db.query('api::vehicle.vehicle').findOne({
        where: { 
          documentId: id,
          company: companyProfile.id 
        },
        populate: ['institution', 'photo']
      });

      if (!vehicle) {
        return ctx.notFound('Araç bulunamadı');
      }

      return ctx.send({
        data: vehicle
      });
    } catch (error) {
      console.error('Find one vehicle error:', error);
      return ctx.internalServerError('Araç yüklenirken bir hata oluştu: ' + error.message);
    }
  },

  /**
   * Update vehicle (with company check)
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

      // Check if vehicle belongs to this company
      const existingVehicle = await strapi.db.query('api::vehicle.vehicle').findOne({
        where: { 
          documentId: id,
          company: companyProfile.id 
        }
      });

      if (!existingVehicle) {
        return ctx.notFound('Araç bulunamadı veya erişim yetkiniz yok');
      }

      // Update vehicle using the integer ID
      const vehicle = await strapi.db.query('api::vehicle.vehicle').update({
        where: { id: existingVehicle.id },
        data: data,
        populate: ['institution', 'photo']
      });

      return ctx.send({
        data: vehicle
      });
    } catch (error) {
      console.error('Update vehicle error:', error);
      return ctx.internalServerError('Araç güncellenirken bir hata oluştu: ' + error.message);
    }
  },

  /**
   * Delete vehicle (with company check)
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

      // Check if vehicle belongs to this company
      const existingVehicle = await strapi.db.query('api::vehicle.vehicle').findOne({
        where: { 
          documentId: id,
          company: companyProfile.id 
        }
      });

      if (!existingVehicle) {
        return ctx.notFound('Araç bulunamadı veya erişim yetkiniz yok');
      }

      // Delete vehicle
      await strapi.db.query('api::vehicle.vehicle').delete({
        where: { documentId: id }
      });

      return ctx.send({
        data: existingVehicle
      });
    } catch (error) {
      console.error('Delete vehicle error:', error);
      return ctx.internalServerError('Araç silinirken bir hata oluştu: ' + error.message);
    }
  }
}));






