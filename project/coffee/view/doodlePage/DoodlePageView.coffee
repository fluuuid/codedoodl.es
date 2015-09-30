AbstractViewPage     = require '../AbstractViewPage'
CodeWordTransitioner = require '../../utils/CodeWordTransitioner'
MediaQueries         = require '../../utils/MediaQueries'

class DoodlePageView extends AbstractViewPage

	template : 'page-doodle'
	model    : null

	routeArgs    : null
	colourScheme : null
	refreshTimer : null

	infoScroller : null

	MIN_PADDING_TOP    : 230
	MIN_PADDING_BOTTOM : 85

	constructor : ->

		@templateVars =
			refresh_btn_title : @CD().locale.get "doodle_refresh_btn_title"
			random_btn_title  : @CD().locale.get "doodle_random_btn_title"

		super()

		return null

	init : =>

		@$frame        = @$el.find('[data-doodle-frame]')
		@$infoContent  = @$el.find('[data-doodle-info]')
		@$instructions = @$el.find('[data-doodle-instructions]')

		@$prevDoodleNav = @$el.find('[data-doodle-nav="prev"]')
		@$nextDoodleNav = @$el.find('[data-doodle-nav="next"]')

		@$refreshBtn = @$el.find('[data-doodle-refresh]')
		@$randomBtn  = @$el.find('[data-doodle-random]')

		null

	setListeners : (setting) =>

		@CD().appView[setting] @CD().appView.EVENT_UPDATE_DIMENSIONS, @onResize

		@CD().appView.header[setting] @CD().appView.header.EVENT_DOODLE_INFO_OPEN, @onInfoOpen
		@CD().appView.header[setting] @CD().appView.header.EVENT_DOODLE_INFO_CLOSE, @onInfoClose

		@$el[setting] 'click', '[data-share-btn]', @onShareBtnClick
		# @$infoContent[setting] 'click', @onInfoContentClick

		@$refreshBtn[setting] 'click', @onRefreshBtnClick
		@$randomBtn[setting] 'click', @onRandomBtnClick

		null

	onResize : =>

		@setupInfoDims()

		null

	show : (cb) =>

		@model = @getDoodle()
		@model.set "viewed", true

		canShowDoodle = @CD().appView.dims.w >= 750 or @model.get('mobile_friendly')

		@setupUI()
		if canShowDoodle
			@setupInstructions()
		else
			@setupMobileFallback()

		super

		callback = if canShowDoodle then 'showFrame' else 'showMobileFallback'

		if @CD().nav.changeViewCount is 1
			@CD().appView.on @CD().appView.EVENT_PRELOADER_HIDE, =>
				@[callback] false, 2000
		else
			@CD().appView.transitioner.on @CD().appView.transitioner.EVENT_TRANSITIONER_OUT_DONE, @[callback]

		null

	hide : (cb) =>

		@CD().appView.header.hideDoodleInfo()

		super

		null

	setupUI : =>

		@$infoContent.html @getDoodleInfoContent()

		@$el.attr 'data-color-scheme', @model.get('colour_scheme')
		@$frame.attr('src', '').removeClass('show')

		@colourScheme = if @model.get('colour_scheme') is 'light' then 'black' else 'white'

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

	setupInfoDims : =>

		@$doodleInfoContent = @$el.find('[data-doodle-info-content]')
		@$doodleInfoContent.removeClass('enable-overflow').css({ top: ''})
			.find('.doodle-info-inner').css({ maxHeight: '' })

		contentOffset = @$doodleInfoContent.offset().top

		requiresOverflow = (contentOffset <= @MIN_PADDING_TOP) and (@CD().appView.dims.w >= 750) # this 750 is from the grid breakpoints which aren't available to MediaQueries clas

		console.log "setupInfoDims : =>", contentOffset, requiresOverflow

		if requiresOverflow

			top       = @MIN_PADDING_TOP
			maxHeight = @CD().appView.dims.h - @MIN_PADDING_TOP - @MIN_PADDING_BOTTOM

			@_setupInfoWithOverflow top, maxHeight

		else

			@_setupInfoWithoutOverflow()

		null

	_setupInfoWithOverflow : (top, maxHeight) =>

		@$doodleInfoContent.addClass('enable-overflow').css({ top: top })
			.find('.doodle-info-inner').css({ maxHeight: maxHeight })

		$infoContentInner = @$doodleInfoContent.find('.doodle-info-inner')

		if !Modernizr.touch

			iScrollOpts = 
				mouseWheel            : true
				scrollbars            : true
				interactiveScrollbars : true
				fadeScrollbars        : true
				momentum              : false
				bounce                : false
				preventDefault        : false

			if @infoScroller
				@infoScroller.refresh()
			else
				@infoScroller = new IScroll $infoContentInner[0], iScrollOpts

		null

	_setupInfoWithoutOverflow : =>

		@$doodleInfoContent.removeClass('enable-overflow').css({ top: '' })
			.find('.doodle-info-inner').css({ maxHeight: '' })

		@infoScroller?.destroy()
		@infoScroller = null

		null

	setupMobileFallback : =>

		if Modernizr.video.webm is 'probably'
			videoType = 'webm'
		else
			videoType = 'mp4'

		@$instructions
			.addClass('show-fallback')
			.html(@CD().locale.get("doodle_mobile_fallback_msg"))
			.find('a')
				.attr('href', "#{@CD().DOODLES_URL}/#{@model.get('slug')}/thumb.#{videoType}")

		null

	showFrame : (removeEvent=true, delay=null) =>

		if removeEvent then @CD().appView.transitioner.off @CD().appView.transitioner.EVENT_TRANSITIONER_OUT_DONE, @showFrame

		@$frame.attr 'src', "#{@CD().DOODLES_URL}/#{@model.get('slug')}/index.html"
		@$frame.one 'load', => @showDoodle delay

		null

	showDoodle : (delay=false) =>

		@$frame.addClass('show')
		setTimeout =>
			blankInstructions = @model.get('instructions').split('').map(-> return ' ').join('')
			CodeWordTransitioner.to blankInstructions, @$instructions, @colourScheme
		, delay or 0

		# allow frame to transition in and then focus it
		setTimeout =>
			@$frame.focus()
		, 500

		null

	showMobileFallback : (removeEvent=true, delay=null) =>

		# could put something here if was that way inclined...

		if removeEvent then @CD().appView.transitioner.off @CD().appView.transitioner.EVENT_TRANSITIONER_OUT_DONE, @showMobileFallback

		null

	hideDoodle : =>

		@$frame.removeClass('show')

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

		doodle = @CD().appData.doodles.getDoodleBySlug @routeArgs.sub+'/'+@routeArgs.ter

		doodle

	getDoodleInfoContent : =>

		doodleInfoVars =
			indexHTML                   : @model.get('indexHTML')
			thumb                       : @CD().DOODLES_URL + '/' + @model.get('slug') + '/thumb.jpg'
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
			share_url                   : @CD().BASE_URL + '/' + @model.get('id')
			share_url_text              : @CD().BASE_URL.replace('http://', '') + '/' + @model.get('id')
			mouse_enabled               : @model.get('interaction.mouse')
			keyboard_enabled            : @model.get('interaction.keyboard')
			touch_enabled               : @model.get('interaction.touch')

		doodleInfoContent = _.template(@CD().templates.get('doodle-info'))(doodleInfoVars)

		doodleInfoContent

	_getInteractionContent : =>

		interactions = []

		if @model.get('interaction.mouse') then interactions.push @CD().locale.get "doodle_label_interaction_mouse"
		if @model.get('interaction.keyboard') then interactions.push @CD().locale.get "doodle_label_interaction_keyboard"
		if @model.get('interaction.touch') then interactions.push @CD().locale.get "doodle_label_interaction_touch"

		interactions.join(', ') or @CD().locale.get "doodle_label_interaction_none"

	onInfoOpen : =>

		@setupInfoDims()

		@$el.addClass('show-info')

		null

	onInfoClose : =>

		@$el.removeClass('show-info')

		setTimeout =>
			@infoScroller?.destroy()
			@infoScroller = null
			@$frame.focus()
		, 500

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
			share_url     : @CD().BASE_URL + '/' + @model.get('id')
			doodle_tags   : _.map(@model.get('tags'), (tag) -> '#' + tag).join(' ')

		desc = @supplantString @CD().locale.get('doodle_share_text_tmpl'), vars, false

		desc.replace(/&nbsp;/g, ' ')

	onInfoContentClick : (e) =>

		if e.target is @$infoContent[0] then @CD().appView.header.hideDoodleInfo()

		null

	onRefreshBtnClick : =>

		CodeWordTransitioner.in @$instructions, @colourScheme
		@hideDoodle()

		clearTimeout @refreshTimer
		@refreshTimer = setTimeout =>
			@showFrame false, 2000
		, 1000

		null

	onRandomBtnClick : =>

		randomDoodle = @CD().appData.doodles.getRandomUnseen()
		@CD().router.navigateTo @CD().nav.sections.DOODLES + '/' + randomDoodle.get('slug')

		null

module.exports = DoodlePageView
