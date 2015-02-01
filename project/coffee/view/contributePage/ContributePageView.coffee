AbstractViewPage = require '../AbstractViewPage'

class ContributePageView extends AbstractViewPage

	template : 'page-contribute'

	constructor : ->

		@templateVars = 
			desc : @CD().locale.get "contribute_desc"

		###

		instantiate classes here

		@exampleClass = new exampleClass

		###

		super()

		###

		add classes to app structure here

		@
			.addChild(@exampleClass)

		###

		return null

module.exports = ContributePageView
