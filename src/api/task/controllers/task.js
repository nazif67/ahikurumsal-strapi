'use strict';

/**
 * task controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::task.task', ({ strapi }) => ({
  /**
   * Find tasks - filtered by company
   * GET /api/tasks
   */
  async find(ctx) {
    try {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('Giriş yapmalısınız');
      }

      // Get user's company profile
      const companyProfiles = await strapi.db.query('api::company-profile.company-profile').findMany({
        where: { owner: user.id },
        limit: 1
      });

      if (!companyProfiles || companyProfiles.length === 0) {
        console.log('Company profile not found for user:', user.id);
        return ctx.send({ data: [] }); // Return empty array instead of error
      }

      const companyProfile = companyProfiles[0];
      console.log('Finding tasks for company:', companyProfile.id);

      // Get tasks filtered by company
      const tasks = await strapi.db.query('api::task.task').findMany({
        where: {
          company: companyProfile.id
        },
        populate: {
          assignedTo: {
            populate: ['photo', 'department']
          },
          assignedBy: true,
          company: true
        },
        orderBy: { dueDate: 'asc' },
        limit: 100
      });

      console.log('Found tasks:', tasks.length);

      return ctx.send({
        data: tasks
      });
    } catch (error) {
      console.error('Find tasks error:', error);
      console.error('Error stack:', error.stack);
      return ctx.send({ data: [], error: error.message });
    }
  },

  /**
   * Create task - auto assign company
   * POST /api/tasks
   */
  async create(ctx) {
    try {
      const user = ctx.state.user;
      console.log('Creating task, user:', user?.id);

      if (!user) {
        return ctx.unauthorized('Giriş yapmalısınız');
      }

      // Get user's company profile
      const companyProfiles = await strapi.db.query('api::company-profile.company-profile').findMany({
        where: { owner: user.id },
        limit: 1
      });

      if (!companyProfiles || companyProfiles.length === 0) {
        console.error('Company profile not found for user:', user.id);
        return ctx.forbidden('Şirket profili bulunamadı');
      }

      const companyProfile = companyProfiles[0];
      console.log('Company profile found:', companyProfile.id);

      // Get task data from request
      const taskData = ctx.request.body.data || ctx.request.body;
      console.log('Task data received:', taskData);

      // Convert assignedTo documentId to id if needed
      let assignedToId = taskData.assignedTo;
      if (assignedToId) {
        // Check if it's a documentId (string) or id (number)
        if (typeof assignedToId === 'string') {
          const worker = await strapi.db.query('api::worker.worker').findOne({
            where: { documentId: assignedToId }
          });
          
          if (!worker) {
            console.error('Worker not found with documentId:', assignedToId);
            return ctx.badRequest('Atanan çalışan bulunamadı');
          }
          
          assignedToId = worker.id;
          console.log('Converted documentId to id:', assignedToId);
        }
      }

      // Add company to task data
      const dataToCreate = {
        title: taskData.title,
        description: taskData.description,
        assignedTo: assignedToId,
        dueDate: taskData.dueDate,
        isRecurring: taskData.isRecurring || false,
        recurringInterval: taskData.recurringInterval,
        priority: taskData.priority || 'medium',
        status: 'pending',
        company: companyProfile.id,
        assignedBy: user.id
      };

      console.log('Creating task with data:', dataToCreate);

      const task = await strapi.db.query('api::task.task').create({
        data: dataToCreate,
        populate: {
          assignedTo: {
            populate: ['photo', 'department']
          },
          assignedBy: true,
          company: true
        }
      });

      console.log('Task created successfully:', task.id);

      return ctx.send({
        data: task
      });
    } catch (error) {
      console.error('Create task error:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      return ctx.badRequest(`Görev oluşturulurken bir hata oluştu: ${error.message}`);
    }
  },

  /**
   * Update task - check company ownership
   * PUT /api/tasks/:id
   */
  async update(ctx) {
    try {
      const { id } = ctx.params;
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('Giriş yapmalısınız');
      }

      // Get user's company profile
      const companyProfiles = await strapi.db.query('api::company-profile.company-profile').findMany({
        where: { owner: user.id },
        limit: 1
      });

      if (!companyProfiles || companyProfiles.length === 0) {
        return ctx.forbidden('Şirket profili bulunamadı');
      }

      const companyProfile = companyProfiles[0];

      // Check if task belongs to user's company
      const task = await strapi.db.query('api::task.task').findOne({
        where: { documentId: id },
        populate: { company: true }
      });

      if (!task) {
        return ctx.notFound('Görev bulunamadı');
      }

      if (!task.company || task.company.id !== companyProfile.id) {
        return ctx.forbidden('Bu görevi güncelleyemezsiniz');
      }

      const updateData = ctx.request.body.data || ctx.request.body;
      
      const updatedTask = await strapi.db.query('api::task.task').update({
        where: { id: task.id },
        data: updateData,
        populate: {
          assignedTo: {
            populate: ['photo', 'department']
          },
          assignedBy: true,
          company: true
        }
      });

      return ctx.send({
        data: updatedTask
      });
    } catch (error) {
      console.error('Update task error:', error);
      console.error('Error stack:', error.stack);
      return ctx.badRequest(`Görev güncellenirken bir hata oluştu: ${error.message}`);
    }
  },

  /**
   * Delete task - check company ownership
   * DELETE /api/tasks/:id
   */
  async delete(ctx) {
    try {
      const { id } = ctx.params;
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('Giriş yapmalısınız');
      }

      // Get user's company profile
      const companyProfiles = await strapi.db.query('api::company-profile.company-profile').findMany({
        where: { owner: user.id },
        limit: 1
      });

      if (!companyProfiles || companyProfiles.length === 0) {
        return ctx.forbidden('Şirket profili bulunamadı');
      }

      const companyProfile = companyProfiles[0];

      // Check if task belongs to user's company
      const task = await strapi.db.query('api::task.task').findOne({
        where: { documentId: id },
        populate: { company: true }
      });

      if (!task) {
        return ctx.notFound('Görev bulunamadı');
      }

      if (!task.company || task.company.id !== companyProfile.id) {
        return ctx.forbidden('Bu görevi silemezsiniz');
      }

      await strapi.db.query('api::task.task').delete({
        where: { id: task.id }
      });

      return ctx.send({
        data: task
      });
    } catch (error) {
      console.error('Delete task error:', error);
      console.error('Error stack:', error.stack);
      return ctx.badRequest(`Görev silinirken bir hata oluştu: ${error.message}`);
    }
  },

  /**
   * Update task status by worker
   * PUT /api/tasks/:id/status
   */
  async updateStatus(ctx) {
    try {
      const { id } = ctx.params;
      const { status, statusNote } = ctx.request.body;
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('Giriş yapmalısınız');
      }

      const task = await strapi.db.query('api::task.task').findOne({
        where: { documentId: id },
        populate: {
          assignedTo: {
            populate: ['user', 'company']
          },
          company: true
        }
      });

      if (!task) {
        return ctx.notFound('Görev bulunamadı');
      }

      // Check if user is the assigned worker
      if (!task.assignedTo || !task.assignedTo.user || task.assignedTo.user.id !== user.id) {
        return ctx.forbidden('Bu görevi güncelleyemezsiniz');
      }

      // Additional security: Check if worker's company matches task's company
      if (task.company && task.assignedTo.company) {
        if (task.company.id !== task.assignedTo.company.id) {
          return ctx.forbidden('Bu göreve erişim yetkiniz yok');
        }
      }

      const updateData = {
        status,
        statusNote: statusNote || task.statusNote
      };

      // If status is completed, set completedAt
      if (status === 'completed') {
        updateData.completedAt = new Date();
      }

      // If due date passed and status is not completed, auto set to not_completed
      const now = new Date();
      const dueDate = new Date(task.dueDate);
      if (dueDate < now && status !== 'completed' && status !== 'not_completed') {
        updateData.status = 'not_completed';
        updateData.statusNote = 'Teslim tarihi geçti';
      }

      const updatedTask = await strapi.db.query('api::task.task').update({
        where: { id: task.id },
        data: updateData
      });

      return ctx.send({
        data: updatedTask
      });
    } catch (error) {
      console.error('Update task status error:', error);
      console.error('Error stack:', error.stack);
      return ctx.badRequest(`Görev durumu güncellenirken bir hata oluştu: ${error.message}`);
    }
  },

  /**
   * Get tasks for a worker
   * GET /api/tasks/my-tasks
   */
  async getMyTasks(ctx) {
    try {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('Giriş yapmalısınız');
      }

      // Find worker by user
      const worker = await strapi.db.query('api::worker.worker').findOne({
        where: { user: user.id },
        populate: { company: true }
      });

      if (!worker) {
        console.log('Worker profile not found for user:', user.id);
        return ctx.send({ data: [] }); // Return empty array instead of error
      }

      // Get all tasks for this worker filtered by company
      const whereCondition = {
        assignedTo: worker.id
      };

      // Add company filter if worker has a company
      if (worker.company?.id) {
        whereCondition.company = worker.company.id;
      }

      const tasks = await strapi.db.query('api::task.task').findMany({
        where: whereCondition,
        populate: {
          assignedBy: true,
          company: true
        },
        orderBy: { dueDate: 'asc' }
      });

      // Auto-update overdue tasks
      const now = new Date();
      for (const task of tasks) {
        const dueDate = new Date(task.dueDate);
        if (dueDate < now && task.status !== 'completed' && task.status !== 'not_completed') {
          await strapi.db.query('api::task.task').update({
            where: { id: task.id },
            data: {
              status: 'not_completed',
              statusNote: 'Teslim tarihi geçti'
            }
          });
        }
      }

      // Refetch after updates
      const updatedTasks = await strapi.db.query('api::task.task').findMany({
        where: whereCondition,
        populate: {
          assignedBy: true,
          company: true
        },
        orderBy: { dueDate: 'asc' }
      });

      return ctx.send({
        data: updatedTasks
      });
    } catch (error) {
      console.error('Get my tasks error:', error);
      console.error('Error stack:', error.stack);
      return ctx.send({ data: [], error: error.message });
    }
  }
}));
