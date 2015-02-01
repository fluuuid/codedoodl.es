AbstractViewPage = require '../AbstractViewPage'

class HomeView extends AbstractViewPage

	template : 'page-home'

	constructor : ->

		@templateVars = 
			desc : @__NAMESPACE__().locale.get "home_desc"

		###

		instantiate classes here

		@exampleClass = new ExampleClass

		###

		super()

		###

		add classes to app structure here

		@
			.addChild(@exampleClass)

		###

		return null

module.exports = HomeView
