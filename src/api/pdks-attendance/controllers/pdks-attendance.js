'use strict';

/**
 * pdks-attendance controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::pdks-attendance.pdks-attendance', ({ strapi }) => ({
  /**
   * Worker check-in/check-out using QR code
   * POST /api/pdks-attendances/check
   */
  async check(ctx) {
    try {
      const user = ctx.state.user;
      
      if (!user) {
        return ctx.unauthorized('Giriş yapmanız gerekiyor');
      }

      const { sessionToken, checkType, latitude, longitude } = ctx.request.body;

      if (!sessionToken || !checkType) {
        return ctx.badRequest('QR kod token ve giriş/çıkış tipi gereklidir');
      }

      if (!['in', 'out'].includes(checkType)) {
        return ctx.badRequest('Geçersiz giriş/çıkış tipi. "in" veya "out" olmalıdır');
      }

      // Get worker profile
      const worker = await strapi.db.query('api::worker.worker').findOne({
        where: { user: user.id },
        populate: ['company', 'branch']
      });

      if (!worker) {
        return ctx.forbidden('Çalışan profili bulunamadı. Sadece çalışanlar giriş-çıkış yapabilir.');
      }

      if (!worker.isActive) {
        return ctx.forbidden('Hesabınız aktif değil. Lütfen yöneticinizle iletişime geçin.');
      }

      // Validate QR session
      const session = await strapi.db.query('api::qr-code-session.qr-code-session').findOne({
        where: { sessionToken },
        populate: ['company', 'branch']
      });

      if (!session) {
        return ctx.badRequest('Geçersiz QR kod');
      }

      // Security checks
      if (!session.isActive) {
        return ctx.forbidden('QR kod devre dışı bırakılmış');
      }

      if (new Date(session.expiresAt) < new Date()) {
        return ctx.forbidden('QR kod süresi dolmuş');
      }

      if (session.maxUsageCount && session.usageCount >= session.maxUsageCount) {
        return ctx.forbidden('QR kod kullanım limiti dolmuş');
      }

      // Check if worker belongs to the same company
      if (worker.company.id !== session.company.id) {
        return ctx.forbidden('Bu QR kod şirketinize ait değil');
      }

      // Check location if provided
      if (session.locationLatitude && session.locationLongitude && latitude && longitude) {
        const distance = calculateDistance(
          session.locationLatitude,
          session.locationLongitude,
          latitude,
          longitude
        );

        if (distance > session.locationRadius) {
          return ctx.forbidden(`Konum uyumsuz. ${Math.round(distance)}m uzaklıkta (max: ${session.locationRadius}m)`);
        }
      }

      // Get IP address
      const ipAddress = ctx.request.ip || 
                       ctx.request.headers['x-forwarded-for'] || 
                       ctx.request.socket.remoteAddress;

      // Get User Agent
      const userAgent = ctx.request.headers['user-agent'];

      // Check for duplicate check-in/out within last 1 minute (prevent double scans)
      const oneMinuteAgo = new Date(Date.now() - 60000);
      const recentCheck = await strapi.db.query('api::pdks-attendance.pdks-attendance').findOne({
        where: {
          worker: worker.id,
          checkType,
          checkTime: {
            $gte: oneMinuteAgo.toISOString()
          }
        }
      });

      if (recentCheck) {
        return ctx.badRequest('Son 1 dakika içinde aynı işlemi yaptınız. Lütfen bekleyin.');
      }

      // Check last attendance to validate check type
      const lastAttendance = await strapi.db.query('api::pdks-attendance.pdks-attendance').findOne({
        where: { worker: worker.id },
        orderBy: { checkTime: 'desc' }
      });

      // Validate check type sequence
      if (checkType === 'in' && lastAttendance && lastAttendance.checkType === 'in') {
        return ctx.badRequest('Son kaydınız giriş. Lütfen önce çıkış yapın.');
      }

      if (checkType === 'out' && lastAttendance && lastAttendance.checkType === 'out') {
        return ctx.badRequest('Son kaydınız çıkış. Lütfen önce giriş yapın.');
      }

      // Create attendance record
      const attendance = await strapi.db.query('api::pdks-attendance.pdks-attendance').create({
        data: {
          worker: worker.id,
          company: worker.company.id,
          checkType,
          checkTime: new Date(),
          qrCodeSession: session.id,
          locationLatitude: latitude,
          locationLongitude: longitude,
          ipAddress,
          userAgent,
          isManual: false,
          branch: session.branch?.id || worker.branch?.id || null
        },
        populate: ['worker', 'company', 'branch', 'qrCodeSession']
      });

      // Increment session usage count
      await strapi.db.query('api::qr-code-session.qr-code-session').update({
        where: { id: session.id },
        data: { usageCount: session.usageCount + 1 }
      });

      return ctx.send({
        data: {
          id: attendance.documentId,
          checkType: attendance.checkType,
          checkTime: attendance.checkTime,
          worker: {
            firstName: worker.firstName,
            lastName: worker.lastName
          },
          branch: attendance.branch?.name || null,
          message: checkType === 'in' ? 'Giriş kaydınız oluşturuldu' : 'Çıkış kaydınız oluşturuldu'
        }
      });
    } catch (error) {
      console.error('Check attendance error:', error);
      return ctx.internalServerError('Giriş-çıkış kaydı oluşturulurken bir hata oluştu');
    }
  },

  /**
   * Get worker's own attendance records
   * GET /api/pdks-attendances/my-records
   */
  async getMyRecords(ctx) {
    try {
      const user = ctx.state.user;
      
      if (!user) {
        return ctx.unauthorized('Giriş yapmanız gerekiyor');
      }

      // Get worker profile
      const worker = await strapi.db.query('api::worker.worker').findOne({
        where: { user: user.id }
      });

      if (!worker) {
        return ctx.forbidden('Çalışan profili bulunamadı');
      }

      const { startDate, endDate, limit = 100 } = ctx.query;

      const whereClause = { worker: worker.id };

      if (startDate) {
        whereClause.checkTime = whereClause.checkTime || {};
        whereClause.checkTime.$gte = new Date(startDate).toISOString();
      }

      if (endDate) {
        whereClause.checkTime = whereClause.checkTime || {};
        whereClause.checkTime.$lte = new Date(endDate).toISOString();
      }

      // Get attendance records
      const records = await strapi.db.query('api::pdks-attendance.pdks-attendance').findMany({
        where: whereClause,
        populate: ['branch', 'manualEntryBy'],
        orderBy: { checkTime: 'desc' },
        limit: parseInt(limit)
      });

      return ctx.send({
        data: records.map(record => ({
          id: record.documentId,
          checkType: record.checkType,
          checkTime: record.checkTime,
          branch: record.branch?.name || null,
          isManual: record.isManual,
          notes: record.notes
        }))
      });
    } catch (error) {
      console.error('Get my records error:', error);
      return ctx.internalServerError('Kayıtlar yüklenirken bir hata oluştu');
    }
  },

  /**
   * Get company's attendance records (company only)
   * GET /api/pdks-attendances/company-records
   */
  async getCompanyRecords(ctx) {
    try {
      const user = ctx.state.user;
      
      if (!user) {
        return ctx.unauthorized('Giriş yapmanız gerekiyor');
      }

      // Get company profile
      const companyProfile = await strapi.db.query('api::company-profile.company-profile').findOne({
        where: { owner: user.id }
      });

      if (!companyProfile) {
        return ctx.forbidden('Şirket profili bulunamadı. Sadece şirketler tüm kayıtları görüntüleyebilir.');
      }

      const { startDate, endDate, workerId, branchId, limit = 500 } = ctx.query;

      const whereClause = { company: companyProfile.id };

      if (workerId) {
        // Get worker by documentId
        const worker = await strapi.db.query('api::worker.worker').findOne({
          where: { documentId: workerId }
        });
        if (worker) {
          whereClause.worker = worker.id;
        }
      }

      if (branchId) {
        // Get branch by documentId
        const branch = await strapi.db.query('api::branch.branch').findOne({
          where: { documentId: branchId }
        });
        if (branch) {
          whereClause.branch = branch.id;
        }
      }

      if (startDate) {
        whereClause.checkTime = whereClause.checkTime || {};
        whereClause.checkTime.$gte = new Date(startDate).toISOString();
      }

      if (endDate) {
        whereClause.checkTime = whereClause.checkTime || {};
        whereClause.checkTime.$lte = new Date(endDate).toISOString();
      }

      // Get attendance records
      const records = await strapi.db.query('api::pdks-attendance.pdks-attendance').findMany({
        where: whereClause,
        populate: ['worker', 'branch', 'manualEntryBy'],
        orderBy: { checkTime: 'desc' },
        limit: parseInt(limit)
      });

      return ctx.send({
        data: records.map(record => ({
          id: record.documentId,
          worker: {
            id: record.worker.documentId,
            firstName: record.worker.firstName,
            lastName: record.worker.lastName
          },
          checkType: record.checkType,
          checkTime: record.checkTime,
          branch: record.branch ? {
            id: record.branch.documentId,
            name: record.branch.name
          } : null,
          isManual: record.isManual,
          manualEntryBy: record.manualEntryBy ? {
            id: record.manualEntryBy.documentId,
            username: record.manualEntryBy.username
          } : null,
          notes: record.notes,
          locationLatitude: record.locationLatitude,
          locationLongitude: record.locationLongitude
        }))
      });
    } catch (error) {
      console.error('Get company records error:', error);
      return ctx.internalServerError('Kayıtlar yüklenirken bir hata oluştu');
    }
  },

  /**
   * Get monthly attendance report (company only)
   * GET /api/pdks-attendances/monthly-report
   */
  async getMonthlyReport(ctx) {
    try {
      const user = ctx.state.user;
      
      if (!user) {
        return ctx.unauthorized('Giriş yapmanız gerekiyor');
      }

      // Get company profile
      const companyProfile = await strapi.db.query('api::company-profile.company-profile').findOne({
        where: { owner: user.id }
      });

      if (!companyProfile) {
        return ctx.forbidden('Şirket profili bulunamadı');
      }

      const { year, month, workerId } = ctx.query;

      if (!year || !month) {
        return ctx.badRequest('Yıl ve ay parametreleri gereklidir');
      }

      // Calculate date range
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);

      const whereClause = {
        company: companyProfile.id,
        checkTime: {
          $gte: startDate.toISOString(),
          $lte: endDate.toISOString()
        }
      };

      // If specific worker requested
      if (workerId) {
        const worker = await strapi.db.query('api::worker.worker').findOne({
          where: { documentId: workerId }
        });
        if (worker) {
          whereClause.worker = worker.id;
        }
      }

      // Get all records for the month
      const records = await strapi.db.query('api::pdks-attendance.pdks-attendance').findMany({
        where: whereClause,
        populate: ['worker'],
        orderBy: { checkTime: 'asc' }
      });

      // Group by worker and date
      const reportData = {};

      records.forEach(record => {
        const workerId = record.worker.documentId;
        const workerName = `${record.worker.firstName} ${record.worker.lastName}`;
        const dateKey = new Date(record.checkTime).toISOString().split('T')[0];

        if (!reportData[workerId]) {
          reportData[workerId] = {
            workerId,
            workerName,
            email: record.worker.email,
            days: {}
          };
        }

        if (!reportData[workerId].days[dateKey]) {
          reportData[workerId].days[dateKey] = {
            date: dateKey,
            checkIn: null,
            checkOut: null,
            totalHours: 0
          };
        }

        if (record.checkType === 'in') {
          reportData[workerId].days[dateKey].checkIn = record.checkTime;
        } else if (record.checkType === 'out') {
          reportData[workerId].days[dateKey].checkOut = record.checkTime;
        }

        // Calculate total hours if both check-in and check-out exist
        const day = reportData[workerId].days[dateKey];
        if (day.checkIn && day.checkOut) {
          const diff = new Date(day.checkOut) - new Date(day.checkIn);
          day.totalHours = diff / (1000 * 60 * 60); // Convert to hours
        }
      });

      return ctx.send({
        data: {
          year: parseInt(year),
          month: parseInt(month),
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          workers: Object.values(reportData)
        }
      });
    } catch (error) {
      console.error('Get monthly report error:', error);
      return ctx.internalServerError('Aylık rapor oluşturulurken bir hata oluştu');
    }
  },

  /**
   * Manual attendance entry (company only)
   * POST /api/pdks-attendances/manual-entry
   */
  async manualEntry(ctx) {
    try {
      const user = ctx.state.user;
      
      if (!user) {
        return ctx.unauthorized('Giriş yapmanız gerekiyor');
      }

      // Get company profile
      const companyProfile = await strapi.db.query('api::company-profile.company-profile').findOne({
        where: { owner: user.id }
      });

      if (!companyProfile) {
        return ctx.forbidden('Şirket profili bulunamadı. Sadece şirketler manuel kayıt ekleyebilir.');
      }

      const { workerId, checkType, checkTime, notes, branchId } = ctx.request.body;

      if (!workerId || !checkType || !checkTime) {
        return ctx.badRequest('Çalışan, giriş/çıkış tipi ve zaman gereklidir');
      }

      // Get worker
      const worker = await strapi.db.query('api::worker.worker').findOne({
        where: { documentId: workerId, company: companyProfile.id }
      });

      if (!worker) {
        return ctx.notFound('Çalışan bulunamadı veya şirketinize ait değil');
      }

      let branchInternalId = null;
      if (branchId) {
        const branch = await strapi.db.query('api::branch.branch').findOne({
          where: { documentId: branchId }
        });
        if (branch) {
          branchInternalId = branch.id;
        }
      }

      // Create manual attendance record
      const attendance = await strapi.db.query('api::pdks-attendance.pdks-attendance').create({
        data: {
          worker: worker.id,
          company: companyProfile.id,
          checkType,
          checkTime: new Date(checkTime),
          isManual: true,
          manualEntryBy: user.id,
          notes,
          branch: branchInternalId || worker.branch?.id || null
        },
        populate: ['worker', 'branch', 'manualEntryBy']
      });

      return ctx.send({
        data: {
          id: attendance.documentId,
          worker: {
            firstName: worker.firstName,
            lastName: worker.lastName
          },
          checkType: attendance.checkType,
          checkTime: attendance.checkTime,
          isManual: true,
          notes: attendance.notes,
          message: 'Manuel kayıt başarıyla oluşturuldu'
        }
      });
    } catch (error) {
      console.error('Manual entry error:', error);
      return ctx.internalServerError('Manuel kayıt oluşturulurken bir hata oluştu');
    }
  },

  /**
   * Delete attendance record (company only)
   * DELETE /api/pdks-attendances/:id
   */
  async delete(ctx) {
    try {
      const { id } = ctx.params;
      const user = ctx.state.user;
      
      if (!user) {
        return ctx.unauthorized('Giriş yapmanız gerekiyor');
      }

      // Get company profile
      const companyProfile = await strapi.db.query('api::company-profile.company-profile').findOne({
        where: { owner: user.id }
      });

      if (!companyProfile) {
        return ctx.forbidden('Şirket profili bulunamadı');
      }

      // Get attendance record
      const attendance = await strapi.db.query('api::pdks-attendance.pdks-attendance').findOne({
        where: { 
          documentId: id,
          company: companyProfile.id
        }
      });

      if (!attendance) {
        return ctx.notFound('Kayıt bulunamadı veya şirketinize ait değil');
      }

      // Delete record
      await strapi.db.query('api::pdks-attendance.pdks-attendance').delete({
        where: { id: attendance.id }
      });

      return ctx.send({
        message: 'Kayıt başarıyla silindi',
        success: true
      });
    } catch (error) {
      console.error('Delete attendance error:', error);
      return ctx.internalServerError('Kayıt silinirken bir hata oluştu');
    }
  }
}));

// Helper function to calculate distance between two coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}


