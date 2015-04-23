AbstractViewPage = require '../AbstractViewPage'

class DoodlePageView extends AbstractViewPage

	template : 'page-doodle'
	model    : null

	constructor : ->

		@templateVars = 
			desc : @CD().locale.get "doodle_desc"

		super()

		return null

	init : =>

		@$frame    = @$el.find('[data-doodle-frame]')
		@$mouse    = @$el.find('[data-indicator="mouse"]')
		@$keyboard = @$el.find('[data-indicator="keyboard"]')
		@$touch    = @$el.find('[data-indicator="touch"]')

		null

	show : (cb) =>

		@model = @getDoodle()

		@$el.attr 'data-color-scheme', @model.get('colour_scheme')
		@$frame.attr('src', '').removeClass('show')
		@$mouse.attr 'disabled', !@model.get('interaction.mouse')
		@$keyboard.attr 'disabled', !@model.get('interaction.keyboard')
		@$touch.attr 'disabled', !@model.get('interaction.touch')

		super

		if @CD().nav.changeViewCount is 1
			@showFrame false
		else
			@CD().appView.transitioner.on @CD().appView.transitioner.EVENT_TRANSITIONER_OUT_DONE, @showFrame

		null

	showFrame : (removeEvent=true) =>

		if removeEvent then @CD().appView.transitioner.off @CD().appView.transitioner.EVENT_TRANSITIONER_OUT_DONE, @showFrame

		# TEMP, OBVZ
		srcDir = if @model.get('colour_scheme') is 'light' then 'shape-stream-light' else 'shape-stream'

		@$frame.attr 'src', "http://source.codedoodl.es/sample_doodles/#{srcDir}/index.html"
		@$frame.one 'load', => @$frame.addClass('show')

		null

	getDoodle : =>

		doodle = @CD().appData.doodles.getDoodleBySlug @CD().nav.current.sub+'/'+@CD().nav.current.ter

		doodle

module.exports = DoodlePageView
