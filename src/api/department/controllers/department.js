'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::department.department', ({ strapi }) => ({
  /**
   * Find departments - only return departments for the logged-in user's company
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

      console.log('Finding departments for company:', companyProfile.id);

      // Find departments for this company
      const departments = await strapi.db.query('api::department.department').findMany({
        where: { 
          company: companyProfile.id 
        },
        populate: { company: true },
        orderBy: { createdAt: 'desc' }
      });

      console.log('Found departments:', departments.length);

      return ctx.send({ data: departments });
    } catch (error) {
      console.error('Find departments error:', error);
      console.error('Error stack:', error.stack);
      return ctx.send({ data: [], error: error.message });
    }
  },

  /**
   * Find one department - only if it belongs to user's company
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

      // Get department by documentId
      const department = await strapi.db.query('api::department.department').findOne({
        where: { 
          documentId: id,
          company: companyProfile.id 
        },
        populate: { company: true }
      });

      if (!department) {
        return ctx.notFound('Departman bulunamadı veya bu departmana erişim yetkiniz yok');
      }

      return ctx.send({ data: department });
    } catch (error) {
      console.error('Find one department error:', error);
      console.error('Error stack:', error.stack);
      return ctx.internalServerError('Departman yüklenirken bir hata oluştu');
    }
  },

  /**
   * Create department - automatically link to user's company
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
      const { key, name, description } = requestData;

      if (!key || !name) {
        return ctx.badRequest('Departman kodu ve adı zorunludur');
      }

      // Check if department key already exists for this company
      const existingDepartment = await strapi.db.query('api::department.department').findOne({
        where: { 
          key,
          company: companyProfile.id 
        }
      });

      if (existingDepartment) {
        return ctx.badRequest('Bu departman kodu zaten kullanımda');
      }

      console.log('Creating department for company:', companyProfile.id);

      // Create department
      const newDepartment = await strapi.db.query('api::department.department').create({
        data: {
          key,
          name,
          description,
          company: companyProfile.id
        },
        populate: { company: true }
      });

      console.log('Department created successfully:', newDepartment.id);

      return ctx.send({ data: newDepartment });
    } catch (error) {
      console.error('Create department error:', error);
      console.error('Error stack:', error.stack);
      return ctx.badRequest(`Departman oluşturulurken bir hata oluştu: ${error.message}`);
    }
  },

  /**
   * Update department - only if it belongs to user's company
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

      // Get department by documentId
      const department = await strapi.db.query('api::department.department').findOne({
        where: { documentId: id },
        populate: ['company']
      });

      if (!department) {
        return ctx.notFound('Departman bulunamadı');
      }

      // Check if department belongs to user's company
      if (department.company.id !== companyProfile.id) {
        return ctx.forbidden('Bu departmanı düzenleme yetkiniz yok');
      }

      const requestData = ctx.request.body.data || ctx.request.body;
      const { key, name, description } = requestData;

      // Update department
      const updatedDepartment = await strapi.db.query('api::department.department').update({
        where: { id: department.id },
        data: {
          key,
          name,
          description
        },
        populate: { company: true }
      });

      return ctx.send({ data: updatedDepartment });
    } catch (error) {
      console.error('Update department error:', error);
      return ctx.internalServerError('Departman güncellenirken bir hata oluştu');
    }
  },

  /**
   * Delete department - only if it belongs to user's company
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

      // Get department by documentId
      const department = await strapi.db.query('api::department.department').findOne({
        where: { documentId: id },
        populate: ['company']
      });

      if (!department) {
        return ctx.notFound('Departman bulunamadı');
      }

      // Check if department belongs to user's company
      if (department.company.id !== companyProfile.id) {
        return ctx.forbidden('Bu departmanı silme yetkiniz yok');
      }

      // Delete department
      await strapi.db.query('api::department.department').delete({
        where: { id: department.id }
      });

      return ctx.send({ data: department });
    } catch (error) {
      console.error('Delete department error:', error);
      console.error('Error stack:', error.stack);
      return ctx.badRequest(`Departman silinirken bir hata oluştu: ${error.message}`);
    }
  }
}));
