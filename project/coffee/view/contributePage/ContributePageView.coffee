AbstractViewPage = require '../AbstractViewPage'

class ContributePageView extends AbstractViewPage

	template : 'page-contribute'

	constructor : ->

		@templateVars = 
			label_submit    : @CD().locale.get "contribute_label_submit"
			content_submit  : @CD().locale.get "contribute_content_submit"
			label_contact   : @CD().locale.get "contribute_label_contact"
			content_contact : @CD().locale.get "contribute_content_contact"

		super

		return null

module.exports = ContributePageView
