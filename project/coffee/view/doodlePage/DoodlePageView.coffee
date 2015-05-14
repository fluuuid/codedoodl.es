AbstractViewPage     = require '../AbstractViewPage'
CodeWordTransitioner = require '../../utils/CodeWordTransitioner'

class DoodlePageView extends AbstractViewPage

	template : 'page-doodle'
	model    : null

	colourScheme : null

	constructor : ->

		@templateVars = {}

		super()

		return null

	init : =>

		@$frame        = @$el.find('[data-doodle-frame]')
		@$infoContent  = @$el.find('[data-doodle-info]')
		@$instructions = @$el.find('[data-doodle-instructions]')

		@$mouse    = @$el.find('[data-indicator="mouse"]')
		@$keyboard = @$el.find('[data-indicator="keyboard"]')
		@$touch    = @$el.find('[data-indicator="touch"]')

		@$prevDoodleNav = @$el.find('[data-doodle-nav="prev"]')
		@$nextDoodleNav = @$el.find('[data-doodle-nav="next"]')

		null

	setListeners : (setting) =>

		@CD().appView.header[setting] @CD().appView.header.EVENT_DOODLE_INFO_OPEN, @onInfoOpen
		@CD().appView.header[setting] @CD().appView.header.EVENT_DOODLE_INFO_CLOSE, @onInfoClose
		@$el[setting] 'click', '[data-share-btn]', @onShareBtnClick

		null

	show : (cb) =>

		@model = @getDoodle()

		@setupUI()

		super

		if @CD().nav.changeViewCount is 1
			@showFrame false, true
		else
			@CD().appView.transitioner.on @CD().appView.transitioner.EVENT_TRANSITIONER_OUT_DONE, @showFrame

		null

	hide : (cb) =>

		@CD().appView.header.hideDoodleInfo()

		super

		null

	setupUI : =>

		###
		TEMP!!!
		###
		text = switch @model.get('SAMPLE_DIR')
			when 'shape-stream', 'shape-stream-light' then 'Move your mouse'
			when 'box-physics' then 'Click and drag'
			when 'tubes' then 'Click and hold'
			else ''
		@model.set 'instructions', text
		###
		END TEMP!!!
		###

		@$infoContent.html @getDoodleInfoContent()

		@$el.attr 'data-color-scheme', @model.get('colour_scheme')
		@$frame.attr('src', '').removeClass('show')
		@$mouse.attr 'disabled', !@model.get('interaction.mouse')
		@$keyboard.attr 'disabled', !@model.get('interaction.keyboard')
		@$touch.attr 'disabled', !@model.get('interaction.touch')

		@colourScheme = if @model.get('colour_scheme') is 'light' then 'black' else 'white'

		@setupInstructions()
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

	showFrame : (removeEvent=true, delay=false) =>

		if removeEvent then @CD().appView.transitioner.off @CD().appView.transitioner.EVENT_TRANSITIONER_OUT_DONE, @showFrame

		# TEMP, OBVZ
		SAMPLE_DIR = @model.get('SAMPLE_DIR')

		@$frame.attr 'src', "http://source.codedoodl.es/sample_doodles/#{SAMPLE_DIR}/index.html"
		@$frame.one 'load', => @showDoodle delay

		null

	showDoodle : (delay=false) =>

		@$frame.addClass('show')
		setTimeout =>
			blankInstructions = @model.get('instructions').split('').map(-> return ' ').join('')
			CodeWordTransitioner.to blankInstructions, @$instructions, @colourScheme
		, if delay then 5000 else 0

		null

	setupInstructions : =>

		$newInstructions = @getInstructions()
		@$instructions.replaceWith $newInstructions
		@$instructions = $newInstructions

		null

	getInstructions : =>

		$instructionsEl = $('<span />')
		$instructionsEl
			.addClass('doodle-instructions')
			.attr('data-codeword', '')
			.attr('data-doodle-instructions', '')
			.text(@model.get('instructions').toLowerCase())

		CodeWordTransitioner.prepare $instructionsEl, @colourScheme

		$instructionsEl

	getDoodle : =>

		doodle = @CD().appData.doodles.getDoodleBySlug @CD().nav.current.sub+'/'+@CD().nav.current.ter

		doodle

	getDoodleInfoContent : =>

		# no need to do this for every doodle - only do it if we view the info pane for a particular doodle
		@model.setShortlink()

		doodleInfoVars =
			indexHTML                   : @model.get('indexHTML')
			label_author                : @CD().locale.get "doodle_label_author"
			content_author              : @model.getAuthorHtml()
			label_doodle_name           : @CD().locale.get "doodle_label_doodle_name"
			content_doodle_name         : @model.get('name')
			label_doodle_instructions   : @CD().locale.get 'doodle_label_instructions'
			content_doodle_instructions : @model.get('instructions') or @CD().locale.get 'doodle_label_instructions_none'
			label_description           : @CD().locale.get "doodle_label_description"
			content_description         : @model.get('description')
			label_tags                  : @CD().locale.get "doodle_label_tags"
			content_tags                : @model.get('tags').join(', ')
			label_interaction           : @CD().locale.get "doodle_label_interaction"
			content_interaction         : @_getInteractionContent()
			label_share                 : @CD().locale.get "doodle_label_share"
			share_url                   : @CD().BASE_URL + '/' + @model.get('shortlink')
			share_url_text              : @CD().BASE_URL.replace('http://', '') + '/' + @model.get('shortlink')

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

	onShareBtnClick : (e) =>

		e.preventDefault()

		url         = ' '
		desc        = @getShareDesc()
		shareMethod = $(e.currentTarget).attr('data-share-btn')

		@CD().share[shareMethod] url, desc

		null

	getShareDesc : =>

		vars =
			doodle_name   : @model.get 'name'
			doodle_author : if @model.get('author.twitter') then "@#{@model.get('author.twitter')}" else @model.get('author.name')
			share_url     : @CD().BASE_URL + '/' + @model.get('shortlink')
			doodle_tags   : _.map(@model.get('tags'), (tag) -> '#' + tag).join(' ')

		desc = @supplantString @CD().locale.get('doodle_share_text_tmpl'), vars, false

		desc.replace(/&nbsp;/g, ' ')

module.exports = DoodlePageView
