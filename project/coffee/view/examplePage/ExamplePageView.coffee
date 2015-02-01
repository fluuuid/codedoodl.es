AbstractViewPage = require '../AbstractViewPage'

class ExamplePageView extends AbstractViewPage

	template : 'page-example'

	constructor : ->

		@templateVars = 
			desc : @__NAMESPACE__().locale.get "example_desc"

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

module.exports = ExamplePageView
