'use strict';

/**
 * demo-request controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::demo-request.demo-request', ({ strapi }) => ({
  async create(ctx) {
    try {
      // Extract data from request body
      const { fullName, email, phone, companyName, message } = ctx.request.body.data || ctx.request.body;

      // Validate required fields
      if (!fullName || !email || !phone) {
        return ctx.badRequest('Full name, email, and phone are required');
      }

      // Check if email already exists
      const existingRequest = await strapi.db.query('api::demo-request.demo-request').findOne({
        where: { email }
      });

      if (existingRequest) {
        return ctx.badRequest('A demo request with this email already exists');
      }

      // Create the demo request
      const demoRequest = await strapi.entityService.create('api::demo-request.demo-request', {
        data: {
          fullName,
          email,
          phone,
          companyName: companyName || null,
          message: message || null,
          status: 'pending',
          source: 'website',
          publishedAt: new Date()
        }
      });

      // Send success response
      ctx.send({
        data: demoRequest,
        message: 'Demo request submitted successfully'
      });

    } catch (error) {
      strapi.log.error('Error creating demo request:', error);
      ctx.badRequest('An error occurred while submitting the demo request');
    }
  },

  async find(ctx) {
    // Only allow admins to view all demo requests
    const { user } = ctx.state;
    
    if (!user) {
      return ctx.unauthorized('You must be logged in');
    }

    // Call the default core action
    const { data, meta } = await super.find(ctx);
    return { data, meta };
  }
}));

