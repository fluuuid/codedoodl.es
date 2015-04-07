APIRouteModel = require '../models/core/APIRouteModel'

class API

	@model : new APIRouteModel

	@getContants : =>

		### add more if we wanna use in API strings ###
		BASE_URL : @CD().BASE_URL

	@get : (name, vars) =>

		vars = $.extend true, vars, @getContants()
		return @supplantString @model.get(name), vars

	@supplantString : (str, vals) ->

		return str.replace /{{ ([^{}]*) }}/g, (a, b) ->
			r = vals[b] or if typeof vals[b] is 'number' then vals[b].toString() else ''
		(if typeof r is "string" or typeof r is "number" then r else a)

	@CD : =>

		return window.CD

module.exports = API
