'use strict';

/**
 * qr-code-session controller
 */

const { createCoreController } = require('@strapi/strapi').factories;
const crypto = require('crypto');

module.exports = createCoreController('api::qr-code-session.qr-code-session', ({ strapi }) => ({
  /**
   * Create a new QR code session (company only)
   * POST /api/qr-code-sessions/create
   */
  async createSession(ctx) {
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
        return ctx.forbidden('Şirket profili bulunamadı. Sadece şirketler QR kod oluşturabilir.');
      }

      const { 
        branch, 
        expirationMinutes = 5, 
        maxUsageCount = null,
        sessionName,
        locationLatitude,
        locationLongitude,
        locationRadius,
        allowedIpAddresses,
        notes
      } = ctx.request.body;

      // Resolve branch ID if provided
      let branchId = null;
      if (branch) {
        const branchRecord = await strapi.db.query('api::branch.branch').findOne({
          where: { documentId: branch }
        });
        
        if (!branchRecord) {
          return ctx.badRequest('Belirtilen şube bulunamadı');
        }
        
        branchId = branchRecord.id;
      }

      // Generate unique session token
      const sessionToken = crypto.randomBytes(32).toString('hex');
      
      // Calculate expiration time
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + expirationMinutes);

      // Create QR code session
      const qrSession = await strapi.db.query('api::qr-code-session.qr-code-session').create({
        data: {
          company: companyProfile.id,
          sessionToken,
          expiresAt,
          isActive: true,
          usageCount: 0,
          maxUsageCount,
          branch: branchId,
          sessionName: sessionName || `QR ${new Date().toLocaleString('tr-TR')}`,
          locationLatitude,
          locationLongitude,
          locationRadius: locationRadius || 100,
          allowedIpAddresses,
          notes
        },
        populate: ['company', 'branch']
      });

      return ctx.send({
        data: {
          id: qrSession.documentId,
          sessionToken: qrSession.sessionToken,
          expiresAt: qrSession.expiresAt,
          sessionName: qrSession.sessionName,
          qrCodeData: JSON.stringify({
            token: qrSession.sessionToken,
            company: companyProfile.companyName,
            branch: qrSession.branch?.name || null,
            expiresAt: qrSession.expiresAt
          }),
          branch: qrSession.branch,
          locationRadius: qrSession.locationRadius,
          maxUsageCount: qrSession.maxUsageCount
        }
      });
    } catch (error) {
      console.error('QR session creation error:', error);
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
      return ctx.internalServerError(`QR kod oluşturulurken bir hata oluştu: ${error.message}`);
    }
  },

  /**
   * Get active QR sessions for company
   * GET /api/qr-code-sessions/my-sessions
   */
  async getMySessions(ctx) {
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

      // Get all active sessions
      const sessions = await strapi.db.query('api::qr-code-session.qr-code-session').findMany({
        where: {
          company: companyProfile.id,
          isActive: true,
          expiresAt: {
            $gt: new Date().toISOString()
          }
        },
        populate: ['branch', 'createdBy'],
        orderBy: { createdAt: 'desc' }
      });

      return ctx.send({
        data: sessions.map(session => ({
          id: session.documentId,
          sessionToken: session.sessionToken,
          sessionName: session.sessionName,
          expiresAt: session.expiresAt,
          usageCount: session.usageCount,
          maxUsageCount: session.maxUsageCount,
          branch: session.branch,
          createdAt: session.createdAt,
          qrCodeData: JSON.stringify({
            token: session.sessionToken,
            company: companyProfile.companyName,
            branch: session.branch?.name || null,
            expiresAt: session.expiresAt
          })
        }))
      });
    } catch (error) {
      console.error('Get sessions error:', error);
      return ctx.internalServerError('QR kod oturumları yüklenirken bir hata oluştu');
    }
  },

  /**
   * Deactivate a QR session
   * POST /api/qr-code-sessions/:id/deactivate
   */
  async deactivate(ctx) {
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

      // Get session
      const session = await strapi.db.query('api::qr-code-session.qr-code-session').findOne({
        where: { 
          documentId: id,
          company: companyProfile.id
        }
      });

      if (!session) {
        return ctx.notFound('QR kod oturumu bulunamadı');
      }

      // Deactivate session
      await strapi.db.query('api::qr-code-session.qr-code-session').update({
        where: { id: session.id },
        data: { isActive: false }
      });

      return ctx.send({
        message: 'QR kod oturumu devre dışı bırakıldı',
        success: true
      });
    } catch (error) {
      console.error('Deactivate session error:', error);
      return ctx.internalServerError('QR kod oturumu devre dışı bırakılırken bir hata oluştu');
    }
  },

  /**
   * Validate QR session token (used by workers)
   * POST /api/qr-code-sessions/validate
   */
  async validateSession(ctx) {
    try {
      const { sessionToken, latitude, longitude } = ctx.request.body;

      if (!sessionToken) {
        return ctx.badRequest('QR kod token gereklidir');
      }

      // Get session
      const session = await strapi.db.query('api::qr-code-session.qr-code-session').findOne({
        where: { sessionToken },
        populate: ['company', 'branch']
      });

      if (!session) {
        return ctx.send({
          valid: false,
          error: 'Geçersiz QR kod'
        });
      }

      // Check if active
      if (!session.isActive) {
        return ctx.send({
          valid: false,
          error: 'QR kod devre dışı bırakılmış'
        });
      }

      // Check expiration
      if (new Date(session.expiresAt) < new Date()) {
        return ctx.send({
          valid: false,
          error: 'QR kod süresi dolmuş'
        });
      }

      // Check usage count
      if (session.maxUsageCount && session.usageCount >= session.maxUsageCount) {
        return ctx.send({
          valid: false,
          error: 'QR kod kullanım limiti dolmuş'
        });
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
          return ctx.send({
            valid: false,
            error: `Konum uyumsuz. ${Math.round(distance)}m uzaklıkta (max: ${session.locationRadius}m)`
          });
        }
      }

      // Check IP address if specified
      if (session.allowedIpAddresses) {
        const allowedIps = session.allowedIpAddresses.split(',').map(ip => ip.trim());
        const clientIp = ctx.request.ip || ctx.request.header['x-forwarded-for'] || ctx.request.socket.remoteAddress;
        
        if (!allowedIps.includes(clientIp)) {
          return ctx.send({
            valid: false,
            error: 'IP adresi izin verilenler listesinde değil'
          });
        }
      }

      return ctx.send({
        valid: true,
        data: {
          sessionId: session.documentId,
          company: session.company,
          branch: session.branch,
          expiresAt: session.expiresAt,
          remainingUsages: session.maxUsageCount ? session.maxUsageCount - session.usageCount : null
        }
      });
    } catch (error) {
      console.error('Validate session error:', error);
      return ctx.internalServerError('QR kod doğrulanırken bir hata oluştu');
    }
  }
}));

// Helper function to calculate distance between two coordinates (Haversine formula)
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


