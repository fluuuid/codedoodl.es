AbstractView         = require '../AbstractView'
CodeWordTransitioner = require '../../utils/CodeWordTransitioner'

class Preloader extends AbstractView
	
	cb              : null
	
	TRANSITION_TIME : 0.5

	MIN_WRONG_CHARS : 0
	MAX_WRONG_CHARS : 4

	MIN_CHAR_IN_DELAY : 30
	MAX_CHAR_IN_DELAY : 100

	MIN_CHAR_OUT_DELAY : 30
	MAX_CHAR_OUT_DELAY : 100

	CHARS : 'abcdefhijklmnopqrstuvwxyz0123456789!?*()@£$%^&_-+=[]{}:;\'"\\|<>,./~`'.split('')

	constructor : ->

		@setElement $('#preloader')

		super()

		return null

	init : =>

		@$codeWord = @$el.find('[data-codeword]')
		@$bg1 = @$el.find('[data-bg="1"]')
		@$bg2 = @$el.find('[data-bg="2"]')

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

		CodeWordTransitioner.in @$codeWord, 'white', false, @hide

		null

	onShowComplete : =>

		@cb?()

		null

	hide : =>

		@animateOut @onHideComplete

		null

	onHideComplete : =>

		@cb?()

		null

	animateOut : (cb) =>

		# @animateCharsOut()

		# that'll do
		# setTimeout cb, 2200

		setTimeout =>
			anagram = _.shuffle('codedoodl.es'.split('')).join('')
			CodeWordTransitioner.to anagram, @$codeWord, 'white', false, => @animateBgOut cb
		, 2000

		null

	animateBgOut : (cb) =>

		TweenLite.to @$bg1, 0.5, { delay : 0.2, width : "100%", ease : Expo.easeOut }
		TweenLite.to @$bg1, 0.6, { delay : 0.7, height : "100%", ease : Expo.easeOut }

		TweenLite.to @$bg2, 0.4, { delay : 0.4, width : "100%", ease : Expo.easeOut }
		TweenLite.to @$bg2, 0.5, { delay : 0.8, height : "100%", ease : Expo.easeOut, onComplete : cb }

		setTimeout =>
			CodeWordTransitioner.in @$codeWord, '', false
		, 400

		setTimeout =>
			@$el.removeClass('show-preloader')
		, 1200

		null

module.exports = Preloader
