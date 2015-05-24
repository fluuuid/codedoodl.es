AbstractView         = require '../AbstractView'
Router               = require '../../router/Router'
CodeWordTransitioner = require '../../utils/CodeWordTransitioner'

class Header extends AbstractView

	template : 'site-header'

	FIRST_HASHCHANGE : true
	DOODLE_INFO_OPEN : false

	EVENT_DOODLE_INFO_OPEN   : 'EVENT_DOODLE_INFO_OPEN'
	EVENT_DOODLE_INFO_CLOSE  : 'EVENT_DOODLE_INFO_CLOSE'
	EVENT_HOME_SCROLL_TO_TOP : 'EVENT_HOME_SCROLL_TO_TOP'

	constructor : ->

		@templateVars =
			home    : 
				label    : @CD().locale.get('header_logo_label')
				url      : @CD().BASE_URL + '/' + @CD().nav.sections.HOME
			about : 
				label    : @CD().locale.get('header_about_label')
				url      : @CD().BASE_URL + '/' + @CD().nav.sections.ABOUT
				section  : @CD().nav.sections.ABOUT
			contribute : 
				label    : @CD().locale.get('header_contribute_label')
				url      : @CD().BASE_URL + '/' + @CD().nav.sections.CONTRIBUTE
				section  : @CD().nav.sections.CONTRIBUTE
			close_label : @CD().locale.get('header_close_label')
			info_label : @CD().locale.get('header_info_label')

		super()

		@bindEvents()

		return null

	init : =>

		@$logo              = @$el.find('.logo__link')
		@$navLinkAbout      = @$el.find('.about-btn')
		@$navLinkContribute = @$el.find('.contribute-btn')
		@$infoBtn           = @$el.find('.info-btn')
		@$closeBtn          = @$el.find('.close-btn')

		null

	setCodeWordInitialStates : =>

		state = @getSectionColour()

		console.log "state", state

		@$logo
			.add(@$navLinkAbout)
			.add(@$navLinkContribute)
			.add(@$infoBtn)
			.add(@$closeBtn)
			.attr('data-codeword-initial-state', state)

		null

	bindEvents : =>

		@CD().appView.on @CD().appView.EVENT_PRELOADER_HIDE, @animateTextIn
		@CD().router.on Router.EVENT_HASH_CHANGED, @onHashChange

		@$el.on 'mouseenter', '[data-codeword]', @onWordEnter
		@$el.on 'mouseleave', '[data-codeword]', @onWordLeave

		@$infoBtn.on 'click', @onInfoBtnClick
		@$closeBtn.on 'click', @onCloseBtnClick

		@$el.on 'click', '[data-logo]', @onLogoClick

		@CD().appView.$window.on 'keyup', @onKeyup

		null

	onHashChange : (where) =>

		if @FIRST_HASHCHANGE
			@FIRST_HASHCHANGE = false
			return
		
		@onAreaChange where

		null

	onAreaChange : (section) =>

		@activeSection = section
		
		colour = @getSectionColour section

		@$el.attr 'data-section', section

		CodeWordTransitioner.in @$logo, colour

		# this just for testing, tidy later
		if section is @CD().nav.sections.HOME
			CodeWordTransitioner.in [@$navLinkAbout, @$navLinkContribute], colour
			CodeWordTransitioner.out [@$closeBtn, @$infoBtn], colour
		else if section is @CD().nav.sections.DOODLES
			CodeWordTransitioner.in [@$closeBtn, @$infoBtn], colour
			CodeWordTransitioner.out [@$navLinkAbout, @$navLinkContribute], colour
		else if section is @CD().nav.sections.ABOUT
			CodeWordTransitioner.in [@$navLinkContribute, @$closeBtn], colour
			CodeWordTransitioner.in [@$navLinkAbout], 'white-active'
			CodeWordTransitioner.out [@$infoBtn], colour
		else if section is @CD().nav.sections.CONTRIBUTE
			CodeWordTransitioner.in [@$navLinkAbout, @$closeBtn], colour
			CodeWordTransitioner.in [@$navLinkContribute], 'white-active'
			CodeWordTransitioner.out [@$infoBtn], colour
		else if section is 'doodle-info'
			CodeWordTransitioner.in [@$closeBtn], colour
			CodeWordTransitioner.out [@$navLinkAbout, @$navLinkContribute], colour
			CodeWordTransitioner.in [@$infoBtn], 'red-active'
		else
			CodeWordTransitioner.in [@$closeBtn], colour
			CodeWordTransitioner.out [@$navLinkAbout, @$navLinkContribute, @$infoBtn], colour

		null

	getSectionColour : (section, wordSection=null) =>

		section = section or @CD().nav.current.area or 'home'

		if wordSection and section is wordSection
			if wordSection is 'doodle-info'
				return 'red-active'
			else
				return 'white-active'

		colour = switch section
			when 'home', 'doodle-info' then 'red'
			when @CD().nav.sections.ABOUT then 'white'
			when @CD().nav.sections.CONTRIBUTE then 'white'
			when @CD().nav.sections.DOODLES then @_getDoodleColourScheme()
			else 'white'

		colour

	_getDoodleColourScheme : =>

		doodle = @CD().appData.doodles.getDoodleByNavSection 'current'
		colour = if doodle and doodle.get('colour_scheme') is 'light' then 'black' else 'white'

		colour

	animateTextIn : =>

		@setCodeWordInitialStates()
		@onAreaChange @CD().nav.current.area

		null

	onWordEnter : (e) =>

		$el = $(e.currentTarget)
		wordSection = $el.attr('data-word-section')

		CodeWordTransitioner.scramble $el, @getSectionColour(@activeSection, wordSection)

		null

	onWordLeave : (e) =>

		$el = $(e.currentTarget)
		wordSection = $el.attr('data-word-section')

		CodeWordTransitioner.unscramble $el, @getSectionColour(@activeSection, wordSection)

		null

	onLogoClick : =>

		if @CD().nav.current.area is @CD().nav.sections.HOME
			@trigger @EVENT_HOME_SCROLL_TO_TOP

		null

	onInfoBtnClick : (e) =>

		e.preventDefault()

		return unless @CD().nav.current.area is @CD().nav.sections.DOODLES

		if !@DOODLE_INFO_OPEN then @showDoodleInfo()

		null

	onCloseBtnClick : (e) =>

		if @DOODLE_INFO_OPEN
			e.preventDefault()
			e.stopPropagation()
			@hideDoodleInfo()

		null

	onKeyup : (e) =>

		if e.keyCode is 27 and @CD().nav.current.area is @CD().nav.sections.DOODLES then @hideDoodleInfo()

		null

	showDoodleInfo : =>

		return unless !@DOODLE_INFO_OPEN

		@onAreaChange 'doodle-info'
		@trigger @EVENT_DOODLE_INFO_OPEN
		@DOODLE_INFO_OPEN = true

		null

	hideDoodleInfo : =>

		return unless @DOODLE_INFO_OPEN

		@onAreaChange @CD().nav.current.area
		@trigger @EVENT_DOODLE_INFO_CLOSE
		@DOODLE_INFO_OPEN = false

		null

module.exports = Header
