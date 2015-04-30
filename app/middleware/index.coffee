getTemplateData = require '../utils/getTemplateData'

notFound = (req, res) ->
	res.status(404).render "site/index", getTemplateData('FOUR_OH_FOUR')

module.exports =
	notFound : notFound
