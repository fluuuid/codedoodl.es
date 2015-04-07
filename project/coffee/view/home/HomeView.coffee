AbstractViewPage = require '../AbstractViewPage'

class HomeView extends AbstractViewPage

	template : 'page-home'

	constructor : ->

		@templateVars = 
			desc : @CD().locale.get "home_desc"

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

	show : =>

		super

		html = "<ul>"

		for doodle in @CD().appData.doodles.models

			html += "<li><a href=\"#{@CD().BASE_URL}/#{@CD().nav.sections.DOODLES}/#{doodle.get('slug')}\">#{doodle.get('author.name')} - #{doodle.get('name')}</a></li>"

		html += '</ul>'

		@$el.find('.home-grid').html(html)

		null

module.exports = HomeView
