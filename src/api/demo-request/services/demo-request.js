'use strict';

/**
 * demo-request service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::demo-request.demo-request');

