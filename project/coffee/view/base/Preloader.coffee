AbstractView         = require '../AbstractView'
CodeWordTransitioner = require '../../utils/CodeWordTransitioner'
MediaQueries         = require '../../utils/MediaQueries'

class Preloader extends AbstractView
	
	cb : null

	constructor : ->

		@setElement $('#preloader')

		super()

		return null

	init : =>

		@$codeWord = @$el.find('[data-codeword]')
		@$bg1      = @$el.find('[data-bg="1"]')
		@$bg2      = @$el.find('[data-bg="2"]')

		null

	initIntroMessage : =>

		tmpl = _.template  @CD().templates.get "preloader-intro"
		vars =
			label_caption        : @CD().locale.get "preloader_intro_caption"
			label_extension      : @CD().locale.get "preloader_intro_cta_extension"
			label_enter          : @CD().locale.get "preloader_intro_cta_enter"
			url_chrome_extension : @CD().locale.get "chrome_extension_url"

		@$el.append tmpl vars

		@$introCaption      = @$el.find('[data-intro-caption]')
		@$introBtns         = @$el.find('[data-intro-btns]')
		@$introBtnExtension = @$el.find('[data-intro-btn="extension"]')
		@$introBtnEnter     = @$el.find('[data-intro-btn="enter"]')

		@setIntroListeners 'on'

		null

	setIntroListeners : (setting) =>

		@$el[setting] 'mouseenter', '[data-intro-btn]', @onWordEnter
		@$el[setting] 'mouseleave', '[data-intro-btn]', @onWordLeave

		@$el[setting] 'click', '[data-intro-btn="enter"]', @onEnterBtnClick

		null

	onWordEnter : (e) =>

		$el = $(e.currentTarget)

		CodeWordTransitioner.scramble $el, 'white'

		null

	onWordLeave : (e) =>

		$el = $(e.currentTarget)

		CodeWordTransitioner.unscramble $el, 'white'

		null

	onEnterBtnClick : =>

		@setIntroListeners 'off'

		emptyExtensionText = @CD().locale.get("preloader_intro_cta_extension").split('').map(-> return ' ').join('')
		emptyEnterText     =  @CD().locale.get("preloader_intro_cta_enter").split('').map(-> return ' ').join('')

		CodeWordTransitioner.to emptyEnterText, @$introBtnEnter, '', false
		CodeWordTransitioner.to emptyExtensionText, @$introBtnExtension, '', false, =>

			@$introBtns.removeClass('show')
			CodeWordTransitioner.in @$codeWord, 'white', false, =>

				setTimeout =>

					CodeWordTransitioner.scramble @$codeWord, 'white', false, => @animateBgOut @onHideComplete

				, 2000

		null

	playIntroAnimation : (@cb) =>

		console.log "show : (@cb) =>"

		# DEBUG!
		# @$el.removeClass('show-preloader')
		# return @onHideComplete()

		@$el
			.find('[data-dots]')
				.remove()
				.end()
			.addClass('show-preloader')

		if (!window.localStorage or !window.localStorage.getItem 'CD_VISITED') and (@CD().nav.current.area is @CD().nav.sections.HOME) and MediaQueries.getBreakpoint() isnt 'Small'
			callback = @_playIntroAnimationFirstVisit
		else
			callback = @_playIntroAnimationReturning

		CodeWordTransitioner.in @$codeWord, 'white', false, callback

		null

	_playIntroAnimationFirstVisit : =>

		window.localStorage.setItem 'CD_VISITED', true

		@initIntroMessage()

		console.log "_playIntroAnimationFirstVisit : =>"

		# dawg, I heard you like setTimeout\callback
		setTimeout =>

			CodeWordTransitioner.to '            ', @$codeWord, 'white-no-border', false, =>

				CodeWordTransitioner.in @$introCaption, 'white-no-border', false, =>

					setTimeout =>

						emptyCaption = @CD().locale.get("preloader_intro_caption").split('').map(-> return ' ').join('')
						CodeWordTransitioner.to emptyCaption, @$introCaption, 'white-no-border', false, =>

							@$introBtns.addClass('show')
							CodeWordTransitioner.in [ @$introBtnExtension, @$introBtnEnter ], 'white', false

					, 2000

		, 2000

		null

	_playIntroAnimationReturning : =>

		setTimeout =>
			CodeWordTransitioner.scramble @$codeWord, 'white', false, => @animateBgOut @onHideComplete
		, 2000

		null

	onShowComplete : =>

		@cb?()

		null

	onHideComplete : =>

		@cb?()

		null

	animateBgOut : (cb) =>

		TweenLite.to @$bg1, 0.5, { delay : 0.2, width : "100%", ease : Expo.easeOut }
		TweenLite.to @$bg1, 0.6, { delay : 0.7, height : "100%", ease : Expo.easeOut }

		TweenLite.to @$bg2, 0.4, { delay : 0.4, width : "100%", ease : Expo.easeOut }
		TweenLite.to @$bg2, 0.5, { delay : 0.8, height : "100%", ease : Expo.easeOut, onComplete : cb }

		setTimeout =>
			CodeWordTransitioner.to '            ', @$codeWord, '', false
		, 400

		setTimeout =>
			@$el.removeClass('show-preloader')
		, 1200

		null

module.exports = Preloader
