'use strict';

/**
 * company-profile router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = (() => {
	const routerCore = createCoreRouter('api::company-profile.company-profile')
	return {
		get prefix() {
			return routerCore.prefix
		},
		get routes() {
			return [...routerCore.routes, ...require('./01-custom-company-profile-route.js').routes]
		}
	}
})()
