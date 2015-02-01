class AbstractData

	constructor : ->

		_.extend @, Backbone.Events

		return null

	__NAMESPACE__ : =>

		return window.__NAMESPACE__

module.exports = AbstractData
