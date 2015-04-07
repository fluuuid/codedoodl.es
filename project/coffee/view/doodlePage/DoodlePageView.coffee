AbstractViewPage = require '../AbstractViewPage'

class DoodlePageView extends AbstractViewPage

	template : 'page-doodle'

	constructor : ->

		@templateVars = 
			desc : @CD().locale.get "doodle_desc"

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

module.exports = DoodlePageView
