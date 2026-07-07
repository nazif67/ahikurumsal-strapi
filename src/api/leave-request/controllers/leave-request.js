'use strict';

/**
 * leave-request controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::leave-request.leave-request', ({ strapi }) => ({
  /**
   * Override find method to filter by company
   * GET /api/leave-requests
   */
  async find(ctx) {
    try {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('Giriş yapmalısınız');
      }

      // Find company profile for user (company owner)
      const companyProfile = await strapi.db.query('api::company-profile.company-profile').findOne({
        where: { owner: user.id }
      });

      if (!companyProfile) {
        return ctx.notFound('Şirket profili bulunamadı. Sadece şirket sahipleri izin taleplerini görüntüleyebilir.');
      }

      // Get leave requests for this company only
      const leaveRequests = await strapi.db.query('api::leave-request.leave-request').findMany({
        where: { company: companyProfile.id },
        populate: ['worker', 'worker.photo', 'worker.department', 'reviewedBy'],
        orderBy: { createdAt: 'desc' },
        limit: ctx.query.pagination?.pageSize || 100
      });

      return ctx.send({
        data: leaveRequests
      });
    } catch (error) {
      console.error('Find leave requests error:', error);
      return ctx.internalServerError('İzin talepleri yüklenirken bir hata oluştu: ' + error.message);
    }
  },

  /**
   * Override create method to auto-find worker from user
   * POST /api/leave-requests
   */
  async create(ctx) {
    try {
      const user = ctx.state.user;
      const { data } = ctx.request.body;

      if (!user) {
        return ctx.unauthorized('Giriş yapmalısınız');
      }

      // Find worker by user
      const worker = await strapi.db.query('api::worker.worker').findOne({
        where: { user: user.id },
        populate: ['company']
      });

      if (!worker) {
        return ctx.notFound('Çalışan kaydınız bulunamadı');
      }

      // Create leave request with auto-found worker
      const leaveRequest = await strapi.db.query('api::leave-request.leave-request').create({
        data: {
          worker: worker.id,
          company: worker.company?.id,
          leaveType: data.leaveType,
          startDate: data.startDate,
          endDate: data.endDate,
          totalDays: data.totalDays,
          reason: data.reason || '',
          status: 'pending',
          publishedAt: new Date()
        },
        populate: ['worker', 'company']
      });

      return ctx.send({
        data: leaveRequest
      });
    } catch (error) {
      console.error('Create leave request error:', error);
      return ctx.internalServerError('İzin talebi oluşturulurken bir hata oluştu');
    }
  },

  /**
   * Approve leave request
   * PUT /api/leave-requests/:id/approve
   */
  async approve(ctx) {
    try {
      const { id } = ctx.params;
      const { reviewNote } = ctx.request.body;
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('Giriş yapmalısınız');
      }

      const leaveRequest = await strapi.db.query('api::leave-request.leave-request').findOne({
        where: { documentId: id },
        populate: {
          company: true,
          worker: {
            populate: ['company']
          }
        }
      });

      if (!leaveRequest) {
        return ctx.notFound('İzin talebi bulunamadı');
      }

      // Get company from leave request or worker
      let companyId = leaveRequest.company?.id;
      if (!companyId && leaveRequest.worker?.company) {
        companyId = leaveRequest.worker.company.id;
      }

      if (!companyId) {
        console.error('Company not found for leave request:', id);
        return ctx.badRequest('İzin talebi için şirket bilgisi bulunamadı');
      }

      // Check if user has permission (company owner)
      const companyProfile = await strapi.db.query('api::company-profile.company-profile').findOne({
        where: { id: companyId },
        populate: ['owner']
      });

      if (!companyProfile) {
        console.error('Company profile not found for company id:', companyId);
        return ctx.notFound('Şirket profili bulunamadı');
      }

      if (!companyProfile.owner || companyProfile.owner.id !== user.id) {
        console.log('Authorization failed:', {
          userId: user.id,
          ownerId: companyProfile.owner?.id,
          companyId: companyId
        });
        return ctx.forbidden('Bu işlem için yetkiniz yok');
      }

      const updatedLeaveRequest = await strapi.db.query('api::leave-request.leave-request').update({
        where: { id: leaveRequest.id },
        data: {
          status: 'approved',
          reviewedBy: user.id,
          reviewedAt: new Date(),
          reviewNote: reviewNote || ''
        }
      });

      return ctx.send({
        data: updatedLeaveRequest
      });
    } catch (error) {
      console.error('Approve leave request error:', error);
      return ctx.internalServerError('İzin talebi onaylanırken bir hata oluştu: ' + error.message);
    }
  },

  /**
   * Reject leave request
   * PUT /api/leave-requests/:id/reject
   */
  async reject(ctx) {
    try {
      const { id } = ctx.params;
      const { reviewNote } = ctx.request.body;
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('Giriş yapmalısınız');
      }

      const leaveRequest = await strapi.db.query('api::leave-request.leave-request').findOne({
        where: { documentId: id },
        populate: {
          company: true,
          worker: {
            populate: ['company']
          }
        }
      });

      if (!leaveRequest) {
        return ctx.notFound('İzin talebi bulunamadı');
      }

      // Get company from leave request or worker
      let companyId = leaveRequest.company?.id;
      if (!companyId && leaveRequest.worker?.company) {
        companyId = leaveRequest.worker.company.id;
      }

      if (!companyId) {
        console.error('Company not found for leave request:', id);
        return ctx.badRequest('İzin talebi için şirket bilgisi bulunamadı');
      }

      // Check if user has permission (company owner)
      const companyProfile = await strapi.db.query('api::company-profile.company-profile').findOne({
        where: { id: companyId },
        populate: ['owner']
      });

      if (!companyProfile) {
        console.error('Company profile not found for company id:', companyId);
        return ctx.notFound('Şirket profili bulunamadı');
      }

      if (!companyProfile.owner || companyProfile.owner.id !== user.id) {
        console.log('Authorization failed:', {
          userId: user.id,
          ownerId: companyProfile.owner?.id,
          companyId: companyId
        });
        return ctx.forbidden('Bu işlem için yetkiniz yok');
      }

      const updatedLeaveRequest = await strapi.db.query('api::leave-request.leave-request').update({
        where: { id: leaveRequest.id },
        data: {
          status: 'rejected',
          reviewedBy: user.id,
          reviewedAt: new Date(),
          reviewNote: reviewNote || ''
        }
      });

      return ctx.send({
        data: updatedLeaveRequest
      });
    } catch (error) {
      console.error('Reject leave request error:', error);
      return ctx.internalServerError('İzin talebi reddedilirken bir hata oluştu: ' + error.message);
    }
  },

  /**
   * Get my leave requests (for logged-in worker)
   * GET /api/leave-requests/my-requests
   */
  async getMyRequests(ctx) {
    try {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('Giriş yapmalısınız');
      }

      // Find worker by user
      const worker = await strapi.db.query('api::worker.worker').findOne({
        where: { user: user.id },
        populate: ['user', 'company', 'department']
      });

      if (!worker) {
        return ctx.notFound('Çalışan kaydınız bulunamadı');
      }

      // Get all leave requests for this worker
      const leaveRequests = await strapi.db.query('api::leave-request.leave-request').findMany({
        where: { worker: worker.id },
        populate: ['worker', 'reviewedBy'],
        orderBy: { createdAt: 'desc' }
      });

      return ctx.send({
        data: leaveRequests
      });
    } catch (error) {
      console.error('Get my requests error:', error);
      return ctx.internalServerError('İzin talepleri yüklenirken bir hata oluştu');
    }
  },

  /**
   * Get my remaining leave days (for logged-in worker)
   * GET /api/leave-requests/my-remaining-days
   */
  async getMyRemainingDays(ctx) {
    try {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('Giriş yapmalısınız');
      }

      // Find worker by user
      const worker = await strapi.db.query('api::worker.worker').findOne({
        where: { user: user.id },
        populate: ['user']
      });

      if (!worker) {
        return ctx.notFound('Çalışan kaydınız bulunamadı');
      }

      // Calculate years of service
      const hireDate = new Date(worker.hireDate);
      const today = new Date();
      const yearsOfService = Math.floor((today - hireDate) / (365.25 * 24 * 60 * 60 * 1000));

      // Determine annual leave entitlement
      let totalEntitledDays = 14; // Default for 1-5 years
      if (yearsOfService >= 15) {
        totalEntitledDays = 26;
      } else if (yearsOfService >= 5) {
        totalEntitledDays = 20;
      }

      // Get used leave days for current year
      const currentYear = today.getFullYear();
      const approvedLeaves = await strapi.db.query('api::leave-request.leave-request').findMany({
        where: {
          worker: worker.id,
          status: 'approved',
          leaveType: 'annual',
          startDate: {
            $gte: new Date(currentYear, 0, 1),
            $lte: new Date(currentYear, 11, 31)
          }
        }
      });

      const usedDays = approvedLeaves.reduce((sum, leave) => sum + leave.totalDays, 0);
      const remainingDays = totalEntitledDays - usedDays;

      return ctx.send({
        data: {
          yearsOfService,
          totalEntitledDays,
          usedDays,
          remainingDays
        }
      });
    } catch (error) {
      console.error('Get my remaining days error:', error);
      return ctx.internalServerError('Kalan izin günleri hesaplanırken bir hata oluştu');
    }
  },

  /**
   * Delete leave request (company owner only)
   * DELETE /api/leave-requests/:id
   */
  async delete(ctx) {
    try {
      const { id } = ctx.params;
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('Giriş yapmalısınız');
      }

      const leaveRequest = await strapi.db.query('api::leave-request.leave-request').findOne({
        where: { documentId: id },
        populate: {
          company: true,
          worker: {
            populate: ['company']
          }
        }
      });

      if (!leaveRequest) {
        return ctx.notFound('İzin talebi bulunamadı');
      }

      // Get company from leave request or worker
      let companyId = leaveRequest.company?.id;
      if (!companyId && leaveRequest.worker?.company) {
        companyId = leaveRequest.worker.company.id;
      }

      if (!companyId) {
        console.error('Company not found for leave request:', id);
        return ctx.badRequest('İzin talebi için şirket bilgisi bulunamadı');
      }

      // Check if user has permission (company owner)
      const companyProfile = await strapi.db.query('api::company-profile.company-profile').findOne({
        where: { id: companyId },
        populate: ['owner']
      });

      if (!companyProfile) {
        console.error('Company profile not found for company id:', companyId);
        return ctx.notFound('Şirket profili bulunamadı');
      }

      if (!companyProfile.owner || companyProfile.owner.id !== user.id) {
        console.log('Authorization failed:', {
          userId: user.id,
          ownerId: companyProfile.owner?.id,
          companyId: companyId
        });
        return ctx.forbidden('Bu işlem için yetkiniz yok');
      }

      // Delete the leave request
      await strapi.db.query('api::leave-request.leave-request').delete({
        where: { id: leaveRequest.id }
      });

      return ctx.send({
        data: { success: true, message: 'İzin talebi silindi' }
      });
    } catch (error) {
      console.error('Delete leave request error:', error);
      return ctx.internalServerError('İzin talebi silinirken bir hata oluştu: ' + error.message);
    }
  },

  /**
   * Calculate remaining leave days for a worker
   * GET /api/leave-requests/worker/:workerId/remaining-days
   */
  async getRemainingDays(ctx) {
    try {
      const { workerId } = ctx.params;
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('Giriş yapmalısınız');
      }

      const worker = await strapi.db.query('api::worker.worker').findOne({
        where: { documentId: workerId },
        populate: ['user']
      });

      if (!worker) {
        return ctx.notFound('Çalışan bulunamadı');
      }

      // Calculate years of service
      const hireDate = new Date(worker.hireDate);
      const today = new Date();
      const yearsOfService = Math.floor((today - hireDate) / (365.25 * 24 * 60 * 60 * 1000));

      // Determine annual leave entitlement
      let totalEntitledDays = 14; // Default for 1-5 years
      if (yearsOfService >= 15) {
        totalEntitledDays = 26;
      } else if (yearsOfService >= 5) {
        totalEntitledDays = 20;
      }

      // Get used leave days for current year
      const currentYear = today.getFullYear();
      const approvedLeaves = await strapi.db.query('api::leave-request.leave-request').findMany({
        where: {
          worker: worker.id,
          status: 'approved',
          leaveType: 'annual',
          startDate: {
            $gte: new Date(currentYear, 0, 1),
            $lte: new Date(currentYear, 11, 31)
          }
        }
      });

      const usedDays = approvedLeaves.reduce((sum, leave) => sum + leave.totalDays, 0);
      const remainingDays = totalEntitledDays - usedDays;

      return ctx.send({
        data: {
          yearsOfService,
          totalEntitledDays,
          usedDays,
          remainingDays
        }
      });
    } catch (error) {
      console.error('Get remaining days error:', error);
      return ctx.internalServerError('Kalan izin günleri hesaplanırken bir hata oluştu');
    }
  }
}));

