'use strict';

/**
 * reminder router
 */

module.exports = {
  routes: [
    // Custom routes
    {
      method: 'POST',
      path: '/reminders/:id/send-whatsapp',
      handler: 'api::reminder.reminder.sendWhatsApp',
      config: {
        policies: [],
        middlewares: [],
      }
    },
    {
      method: 'POST',
      path: '/reminders/sync',
      handler: 'api::reminder.reminder.syncReminders',
      config: {
        policies: [],
        middlewares: [],
      }
    },
    // Default CRUD routes
    {
      method: 'GET',
      path: '/reminders',
      handler: 'api::reminder.reminder.find',
      config: {
        policies: [],
        middlewares: [],
      }
    },
    {
      method: 'GET',
      path: '/reminders/:id',
      handler: 'api::reminder.reminder.findOne',
      config: {
        policies: [],
        middlewares: [],
      }
    },
    {
      method: 'POST',
      path: '/reminders',
      handler: 'api::reminder.reminder.create',
      config: {
        policies: [],
        middlewares: [],
      }
    },
    {
      method: 'PUT',
      path: '/reminders/:id',
      handler: 'api::reminder.reminder.update',
      config: {
        policies: [],
        middlewares: [],
      }
    },
    {
      method: 'DELETE',
      path: '/reminders/:id',
      handler: 'api::reminder.reminder.delete',
      config: {
        policies: [],
        middlewares: [],
      }
    }
  ]
};

