AbstractViewPage = require '../AbstractViewPage'

class AboutPageView extends AbstractViewPage

	template : 'page-about'

	constructor : ->

		@templateVars = 
			desc : @CD().locale.get "about_desc"

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

module.exports = AboutPageView
