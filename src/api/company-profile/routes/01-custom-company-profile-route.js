'use strict'

/**
 * affiliate router
 */

module.exports = {
	routes: [{
		method: 'GET',
		path: '/company-profiles/public/:companyId',
		handler: 'api::company-profile.company-profile.public'
	},]
}
