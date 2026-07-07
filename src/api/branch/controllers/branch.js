'use strict';

/**
 * branch controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::branch.branch', ({ strapi }) => ({
  /**
   * Find branches - only return branches for the logged-in user's company
   */
  async find(ctx) {
    const user = ctx.state.user;
    
    if (!user) {
      return ctx.unauthorized('Giriş yapmalısınız');
    }

    try {
      // Get user's company profile
      const companyProfile = await strapi.db.query('api::company-profile.company-profile').findOne({
        where: { owner: user.id }
      });

      if (!companyProfile) {
        console.log('Company profile not found for user:', user.id);
        return ctx.send({ data: [] });
      }

      console.log('Finding branches for company:', companyProfile.id);

      // Find branches for this company
      const branches = await strapi.db.query('api::branch.branch').findMany({
        where: { 
          company: companyProfile.id 
        },
        populate: { company: true },
        orderBy: { createdAt: 'desc' }
      });

      console.log('Found branches:', branches.length);

      return ctx.send({ data: branches });
    } catch (error) {
      console.error('Find branches error:', error);
      console.error('Error stack:', error.stack);
      return ctx.send({ data: [], error: error.message });
    }
  },

  /**
   * Find one branch - only if it belongs to user's company
   */
  async findOne(ctx) {
    const user = ctx.state.user;
    const { id } = ctx.params;
    
    if (!user) {
      return ctx.unauthorized('Giriş yapmalısınız');
    }

    try {
      // Get user's company profile
      const companyProfile = await strapi.db.query('api::company-profile.company-profile').findOne({
        where: { owner: user.id }
      });

      if (!companyProfile) {
        return ctx.forbidden('Şirket profili bulunamadı');
      }

      // Get branch by documentId
      const branch = await strapi.db.query('api::branch.branch').findOne({
        where: { 
          documentId: id,
          company: companyProfile.id 
        },
        populate: { company: true }
      });

      if (!branch) {
        return ctx.notFound('Şube bulunamadı veya bu şubeye erişim yetkiniz yok');
      }

      return ctx.send({ data: branch });
    } catch (error) {
      console.error('Find one branch error:', error);
      console.error('Error stack:', error.stack);
      return ctx.internalServerError('Şube yüklenirken bir hata oluştu');
    }
  },

  /**
   * Create branch - automatically link to user's company
   */
  async create(ctx) {
    const user = ctx.state.user;
    
    if (!user) {
      return ctx.unauthorized('Giriş yapmalısınız');
    }

    try {
      // Get user's company profile
      const companyProfile = await strapi.db.query('api::company-profile.company-profile').findOne({
        where: { owner: user.id }
      });

      if (!companyProfile) {
        return ctx.forbidden('Şirket profili bulunamadı');
      }

      const requestData = ctx.request.body.data || ctx.request.body;
      const { key, name, description, address, city, district, phone } = requestData;

      if (!key || !name) {
        return ctx.badRequest('Şube kodu ve adı zorunludur');
      }

      // Check if branch key already exists for this company
      const existingBranch = await strapi.db.query('api::branch.branch').findOne({
        where: { 
          key,
          company: companyProfile.id 
        }
      });

      if (existingBranch) {
        return ctx.badRequest('Bu şube kodu zaten kullanımda');
      }

      console.log('Creating branch for company:', companyProfile.id);

      // Create branch
      const newBranch = await strapi.db.query('api::branch.branch').create({
        data: {
          key,
          name,
          description,
          address,
          city,
          district,
          phone,
          company: companyProfile.id
        },
        populate: { company: true }
      });

      console.log('Branch created successfully:', newBranch.id);

      return ctx.send({ data: newBranch });
    } catch (error) {
      console.error('Create branch error:', error);
      console.error('Error stack:', error.stack);
      return ctx.badRequest(`Şube oluşturulurken bir hata oluştu: ${error.message}`);
    }
  },

  /**
   * Update branch - only if it belongs to user's company
   */
  async update(ctx) {
    const user = ctx.state.user;
    const { id } = ctx.params;
    
    if (!user) {
      return ctx.unauthorized('Giriş yapmalısınız');
    }

    try {
      // Get user's company profile
      const companyProfile = await strapi.db.query('api::company-profile.company-profile').findOne({
        where: { owner: user.id }
      });

      if (!companyProfile) {
        return ctx.forbidden('Şirket profili bulunamadı');
      }

      // Get branch by documentId
      const branch = await strapi.db.query('api::branch.branch').findOne({
        where: { documentId: id },
        populate: ['company']
      });

      if (!branch) {
        return ctx.notFound('Şube bulunamadı');
      }

      // Check if branch belongs to user's company
      if (branch.company.id !== companyProfile.id) {
        return ctx.forbidden('Bu şubeyi düzenleme yetkiniz yok');
      }

      const requestData = ctx.request.body.data || ctx.request.body;
      const { key, name, description, address, city, district, phone } = requestData;

      // Update branch
      const updatedBranch = await strapi.db.query('api::branch.branch').update({
        where: { id: branch.id },
        data: {
          key,
          name,
          description,
          address,
          city,
          district,
          phone
        },
        populate: { company: true }
      });

      return ctx.send({ data: updatedBranch });
    } catch (error) {
      console.error('Update branch error:', error);
      return ctx.internalServerError('Şube güncellenirken bir hata oluştu');
    }
  },

  /**
   * Delete branch - only if it belongs to user's company
   */
  async delete(ctx) {
    const user = ctx.state.user;
    const { id } = ctx.params;
    
    if (!user) {
      return ctx.unauthorized('Giriş yapmalısınız');
    }

    try {
      // Get user's company profile
      const companyProfile = await strapi.db.query('api::company-profile.company-profile').findOne({
        where: { owner: user.id }
      });

      if (!companyProfile) {
        return ctx.forbidden('Şirket profili bulunamadı');
      }

      // Get branch by documentId
      const branch = await strapi.db.query('api::branch.branch').findOne({
        where: { documentId: id },
        populate: ['company']
      });

      if (!branch) {
        return ctx.notFound('Şube bulunamadı');
      }

      // Check if branch belongs to user's company
      if (branch.company.id !== companyProfile.id) {
        return ctx.forbidden('Bu şubeyi silme yetkiniz yok');
      }

      // Delete branch
      await strapi.db.query('api::branch.branch').delete({
        where: { id: branch.id }
      });

      return ctx.send({ data: branch });
    } catch (error) {
      console.error('Delete branch error:', error);
      console.error('Error stack:', error.stack);
      return ctx.badRequest(`Şube silinirken bir hata oluştu: ${error.message}`);
    }
  }
}));

