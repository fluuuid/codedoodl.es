AbstractViewPage = require '../AbstractViewPage'

class DoodlePageView extends AbstractViewPage

	template : 'page-doodle'
	model    : null

	constructor : ->

		@templateVars = {}

		super()

		return null

	init : =>

		@$frame       = @$el.find('[data-doodle-frame]')
		@$infoContent = @$el.find('[data-doodle-info]')

		@$mouse    = @$el.find('[data-indicator="mouse"]')
		@$keyboard = @$el.find('[data-indicator="keyboard"]')
		@$touch    = @$el.find('[data-indicator="touch"]')

		@$prevDoodleNav = @$el.find('[data-doodle-nav="prev"]')
		@$nextDoodleNav = @$el.find('[data-doodle-nav="next"]')

		null

	setListeners : (setting) =>

		@CD().appView.header[setting] @CD().appView.header.EVENT_DOODLE_INFO_OPEN, @onInfoOpen
		@CD().appView.header[setting] @CD().appView.header.EVENT_DOODLE_INFO_CLOSE, @onInfoClose

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

	hide : (cb) =>

		@CD().appView.header.hideDoodleInfo()

		super

		null

	setupUI : =>

		@$infoContent.html @getDoodleInfoContent()

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

	getDoodleInfoContent : =>

		doodleInfoVars =
			label_author               : @CD().locale.get "doodle_label_author"
			content_author             : @model.getAuthorHtml()
			label_doodle_name          : @CD().locale.get "doodle_label_doodle_name"
			content_doodle_name        : @model.get('name')
			label_description          : @CD().locale.get "doodle_label_description"
			content_description        : @model.get('description')
			label_tags                 : @CD().locale.get "doodle_label_tags"
			content_tags               : @model.get('tags').join(', ')
			label_interaction          : @CD().locale.get "doodle_label_interaction"
			content_interaction        : @_getInteractionContent()
			label_share                : @CD().locale.get "doodle_label_share"

		doodleInfoContent = _.template(@CD().templates.get('doodle-info'))(doodleInfoVars)

		doodleInfoContent

	_getInteractionContent : =>

		interactions = []

		if @model.get('interaction.mouse') then interactions.push @CD().locale.get "doodle_label_interaction_mouse"
		if @model.get('interaction.keyboard') then interactions.push @CD().locale.get "doodle_label_interaction_keyboard"
		if @model.get('interaction.touch') then interactions.push @CD().locale.get "doodle_label_interaction_touch"

		interactions.join(', ') or @CD().locale.get "doodle_label_interaction_none"

	onInfoOpen : =>

		@$el.addClass('show-info')

		null

	onInfoClose : =>

		@$el.removeClass('show-info')

		null

module.exports = DoodlePageView
