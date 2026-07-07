'use strict';

/**
 * pdks-attendance router
 */

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/pdks-attendances/check',
      handler: 'pdks-attendance.check',
      config: {
        policies: [],
        middlewares: []
      }
    },
    {
      method: 'GET',
      path: '/pdks-attendances/my-records',
      handler: 'pdks-attendance.getMyRecords',
      config: {
        policies: [],
        middlewares: []
      }
    },
    {
      method: 'GET',
      path: '/pdks-attendances/company-records',
      handler: 'pdks-attendance.getCompanyRecords',
      config: {
        policies: [],
        middlewares: []
      }
    },
    {
      method: 'GET',
      path: '/pdks-attendances/monthly-report',
      handler: 'pdks-attendance.getMonthlyReport',
      config: {
        policies: [],
        middlewares: []
      }
    },
    {
      method: 'POST',
      path: '/pdks-attendances/manual-entry',
      handler: 'pdks-attendance.manualEntry',
      config: {
        policies: [],
        middlewares: []
      }
    },
    {
      method: 'DELETE',
      path: '/pdks-attendances/:id',
      handler: 'pdks-attendance.delete',
      config: {
        policies: [],
        middlewares: []
      }
    }
  ]
};

