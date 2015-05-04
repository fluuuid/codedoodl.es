_      = require 'underscore'
config = require '../../config/server'
locale = require '../public/data/locales/strings.json'

getTemplateData = (route) ->

	return _.extend {},
		config     : config
		page_title : locale.strings.PAGE_TITLES.strings["page_title_#{route}"]

module.exports = getTemplateData
