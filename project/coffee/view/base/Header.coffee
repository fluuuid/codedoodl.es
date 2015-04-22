AbstractView         = require '../AbstractView'
Router               = require '../../router/Router'
CodeWordTransitioner = require '../../utils/CodeWordTransitioner'

class Header extends AbstractView

	template : 'site-header'

	FIRST_HASHCHANGE : true

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

	bindEvents : =>

		@CD().appView.on @CD().appView.EVENT_PRELOADER_HIDE, @animateTextIn
		@CD().router.on Router.EVENT_HASH_CHANGED, @onHashChange

		@$el.on 'mouseenter', '[data-codeword]', @onWordEnter
		@$el.on 'mouseleave', '[data-codeword]', @onWordLeave

		null

	onHashChange : (where) =>

		if @FIRST_HASHCHANGE
			@FIRST_HASHCHANGE = false
			return
		
		@onAreaChange where

		null

	onAreaChange : (section) =>

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
			CodeWordTransitioner.in [@$navLinkAbout], 'black-white-bg'
			CodeWordTransitioner.out [@$infoBtn], colour
		else if section is @CD().nav.sections.CONTRIBUTE
			CodeWordTransitioner.in [@$navLinkAbout, @$closeBtn], colour
			CodeWordTransitioner.in [@$navLinkContribute], 'black-white-bg'
			CodeWordTransitioner.out [@$infoBtn], colour
		else
			CodeWordTransitioner.in [@$closeBtn], colour
			CodeWordTransitioner.out [@$navLinkAbout, @$navLinkContribute, @$infoBtn], colour

		null

	getSectionColour : (section, wordSection=null) =>

		section = section or @CD().nav.current.area or 'home'

		if wordSection and section is wordSection then return 'black-white-bg'

		colour = switch section
			when 'home' then 'red'
			when @CD().nav.sections.ABOUT then 'white'
			when @CD().nav.sections.CONTRIBUTE then 'white'
			else 'white'

		colour

	animateTextIn : =>

		@onAreaChange @CD().nav.current.area

		null

	onWordEnter : (e) =>

		$el = $(e.currentTarget)
		wordSection = $el.attr('data-word-section')

		CodeWordTransitioner.scramble $el, @getSectionColour(null, wordSection)

		null

	onWordLeave : (e) =>

		$el = $(e.currentTarget)
		wordSection = $el.attr('data-word-section')

		CodeWordTransitioner.unscramble $el, @getSectionColour(null, wordSection)

		null

module.exports = Header
