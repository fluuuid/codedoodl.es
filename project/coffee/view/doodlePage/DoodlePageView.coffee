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

		@$prevDoodleNav = @$el.find('[data-doodle-nav="prev"]')
		@$nextDoodleNav = @$el.find('[data-doodle-nav="next"]')

		null

	show : (cb) =>

		@model = @getDoodle()

		@setupUI()

		super

		if @CD().nav.changeViewCount is 1
			@showFrame false
		else
			@CD().appView.transitioner.on @CD().appView.transitioner.EVENT_TRANSITIONER_OUT_DONE, @showFrame

		null

	setupUI : =>

		@$el.attr 'data-color-scheme', @model.get('colour_scheme')
		@$frame.attr('src', '').removeClass('show')
		@$mouse.attr 'disabled', !@model.get('interaction.mouse')
		@$keyboard.attr 'disabled', !@model.get('interaction.keyboard')
		@$touch.attr 'disabled', !@model.get('interaction.touch')

		@setupNavLinks()

		null

	setupNavLinks : =>

		prevDoodle = @CD().appData.doodles.getPrevDoodle @model
		nextDoodle = @CD().appData.doodles.getNextDoodle @model

		if prevDoodle
			@$prevDoodleNav.attr('href', prevDoodle.get('url')).addClass('show')
		else
			@$prevDoodleNav.removeClass('show')

		if nextDoodle
			@$nextDoodleNav.attr('href', nextDoodle.get('url')).addClass('show')
		else
			@$nextDoodleNav.removeClass('show')

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
