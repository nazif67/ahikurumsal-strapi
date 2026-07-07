'use strict';

/**
 * reminder controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::reminder.reminder', ({ strapi }) => ({
  /**
   * Find reminders filtered by company
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

      // Get reminders for this company
      const reminders = await strapi.db.query('api::reminder.reminder').findMany({
        where: { company: companyProfile.id },
        populate: ['relatedProperty', 'relatedVehicle', 'relatedProperty.institution', 'relatedVehicle.institution'],
        orderBy: { reminderDate: 'asc' }
      });

      return ctx.send({
        data: reminders
      });
    } catch (error) {
      console.error('Find reminders error:', error);
      return ctx.internalServerError('Anımsatıcılar yüklenirken bir hata oluştu: ' + error.message);
    }
  },

  /**
   * Create reminder
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

      // Create reminder
      const reminder = await strapi.db.query('api::reminder.reminder').create({
        data: {
          ...data,
          company: companyProfile.id
        },
        populate: ['relatedProperty', 'relatedVehicle']
      });

      return ctx.send({
        data: reminder
      });
    } catch (error) {
      console.error('Create reminder error:', error);
      return ctx.internalServerError('Anımsatıcı oluşturulurken bir hata oluştu: ' + error.message);
    }
  },

  /**
   * Find one reminder by ID (with company check)
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

      // Get reminder for this company
      const reminder = await strapi.db.query('api::reminder.reminder').findOne({
        where: { 
          documentId: id,
          company: companyProfile.id 
        },
        populate: ['relatedProperty', 'relatedVehicle', 'relatedProperty.institution', 'relatedVehicle.institution']
      });

      if (!reminder) {
        return ctx.notFound('Anımsatıcı bulunamadı');
      }

      return ctx.send({
        data: reminder
      });
    } catch (error) {
      console.error('Find one reminder error:', error);
      return ctx.internalServerError('Anımsatıcı yüklenirken bir hata oluştu: ' + error.message);
    }
  },

  /**
   * Update reminder (with company check)
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

      // Check if reminder belongs to this company
      const existingReminder = await strapi.db.query('api::reminder.reminder').findOne({
        where: { 
          documentId: id,
          company: companyProfile.id 
        }
      });

      if (!existingReminder) {
        return ctx.notFound('Anımsatıcı bulunamadı veya erişim yetkiniz yok');
      }

      // Update reminder
      const reminder = await strapi.db.query('api::reminder.reminder').update({
        where: { documentId: id },
        data: data,
        populate: ['relatedProperty', 'relatedVehicle', 'relatedProperty.institution', 'relatedVehicle.institution']
      });

      return ctx.send({
        data: reminder
      });
    } catch (error) {
      console.error('Update reminder error:', error);
      return ctx.internalServerError('Anımsatıcı güncellenirken bir hata oluştu: ' + error.message);
    }
  },

  /**
   * Delete reminder (with company check)
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

      // Check if reminder belongs to this company
      const existingReminder = await strapi.db.query('api::reminder.reminder').findOne({
        where: { 
          documentId: id,
          company: companyProfile.id 
        }
      });

      if (!existingReminder) {
        return ctx.notFound('Anımsatıcı bulunamadı veya erişim yetkiniz yok');
      }

      // Delete reminder
      await strapi.db.query('api::reminder.reminder').delete({
        where: { documentId: id }
      });

      return ctx.send({
        data: existingReminder
      });
    } catch (error) {
      console.error('Delete reminder error:', error);
      return ctx.internalServerError('Anımsatıcı silinirken bir hata oluştu: ' + error.message);
    }
  },

  /**
   * Send WhatsApp reminder
   */
  async sendWhatsApp(ctx) {
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

      // Find reminder
      const reminder = await strapi.db.query('api::reminder.reminder').findOne({
        where: { 
          documentId: id,
          company: companyProfile.id
        }
      });

      if (!reminder) {
        return ctx.notFound('Anımsatıcı bulunamadı');
      }

      // Call WhatsApp service
      const whatsappService = strapi.service('api::reminder.reminder');
      const result = await whatsappService.sendWhatsAppMessage(reminder);

      // Update reminder status
      await strapi.db.query('api::reminder.reminder').update({
        where: { documentId: id },
        data: {
          isSent: result.success,
          sentAt: result.success ? new Date() : null,
          status: result.success ? 'sent' : 'failed'
        }
      });

      return ctx.send({
        success: result.success,
        message: result.message
      });
    } catch (error) {
      console.error('Send WhatsApp error:', error);
      return ctx.internalServerError('WhatsApp mesajı gönderilirken bir hata oluştu: ' + error.message);
    }
  },

  /**
   * Sync reminders from properties and vehicles
   */
  async syncReminders(ctx) {
    try {
      const user = ctx.state.user;

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

      let createdCount = 0;

      // Sync from properties - DASK policy dates
      const properties = await strapi.db.query('api::property.property').findMany({
        where: { 
          company: companyProfile.id,
          daskPolicyDate: { $notNull: true }
        },
        populate: ['institution']
      });

      for (const property of properties) {
        // Check if reminder already exists
        const existingReminder = await strapi.db.query('api::reminder.reminder').findOne({
          where: {
            relatedProperty: property.id,
            reminderType: 'dask_policy'
          }
        });

        if (!existingReminder) {
          await strapi.db.query('api::reminder.reminder').create({
            data: {
              title: `DASK Poliçesi - ${property.institution?.name || 'Konut'}`,
              description: `DASK poliçe yenileme tarihi: ${property.address || ''}`,
              reminderDate: property.daskPolicyDate,
              reminderType: 'dask_policy',
              company: companyProfile.id,
              relatedProperty: property.id,
              status: 'pending'
            }
          });
          createdCount++;
        }
      }

      // Sync from vehicles - insurance dates
      const vehiclesInsurance = await strapi.db.query('api::vehicle.vehicle').findMany({
        where: { 
          company: companyProfile.id,
          insurancePolicyDate: { $notNull: true }
        },
        populate: ['institution']
      });

      for (const vehicle of vehiclesInsurance) {
        const existingReminder = await strapi.db.query('api::reminder.reminder').findOne({
          where: {
            relatedVehicle: vehicle.id,
            reminderType: 'vehicle_insurance'
          }
        });

        if (!existingReminder) {
          await strapi.db.query('api::reminder.reminder').create({
            data: {
              title: `Araç Sigortası - ${vehicle.plateNumber}`,
              description: `${vehicle.model} - Sigorta yenileme tarihi`,
              reminderDate: vehicle.insurancePolicyDate,
              reminderType: 'vehicle_insurance',
              company: companyProfile.id,
              relatedVehicle: vehicle.id,
              status: 'pending'
            }
          });
          createdCount++;
        }
      }

      // Sync from vehicles - inspection dates
      const vehiclesInspection = await strapi.db.query('api::vehicle.vehicle').findMany({
        where: { 
          company: companyProfile.id,
          inspectionDate: { $notNull: true }
        },
        populate: ['institution']
      });

      for (const vehicle of vehiclesInspection) {
        const existingReminder = await strapi.db.query('api::reminder.reminder').findOne({
          where: {
            relatedVehicle: vehicle.id,
            reminderType: 'vehicle_inspection'
          }
        });

        if (!existingReminder) {
          await strapi.db.query('api::reminder.reminder').create({
            data: {
              title: `Araç Muayenesi - ${vehicle.plateNumber}`,
              description: `${vehicle.model} - Muayene tarihi`,
              reminderDate: vehicle.inspectionDate,
              reminderType: 'vehicle_inspection',
              company: companyProfile.id,
              relatedVehicle: vehicle.id,
              status: 'pending'
            }
          });
          createdCount++;
        }
      }

      return ctx.send({
        success: true,
        message: `${createdCount} adet anımsatıcı senkronize edildi`,
        createdCount
      });
    } catch (error) {
      console.error('Sync reminders error:', error);
      return ctx.internalServerError('Anımsatıcılar senkronize edilirken bir hata oluştu: ' + error.message);
    }
  }
}));


