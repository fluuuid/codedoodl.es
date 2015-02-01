class AbstractData

	constructor : ->

		_.extend @, Backbone.Events

		return null

	CD : =>

		return window.CD

module.exports = AbstractData
