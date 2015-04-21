AbstractViewPage = require '../AbstractViewPage'

class DoodlePageView extends AbstractViewPage

	template : 'page-doodle'
	model    : null

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

	init : =>

		@$frame = @$el.find('[data-doodle-frame]')

	show : =>

		@model = @getDoodle()

		@$frame.attr 'src', "http://source.codedoodl.es/sample_doodles/shape-stream/index.html"

		super

		null

	getDoodle : =>

		doodle = @CD().appData.doodles.getDoodleBySlug @CD().nav.current.sub+'/'+@CD().nav.current.ter

		doodle

module.exports = DoodlePageView
