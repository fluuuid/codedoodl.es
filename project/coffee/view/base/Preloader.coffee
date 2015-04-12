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

		null

	show : (@cb) =>

		console.log "show : (@cb) =>"

		# DEBUG!
		# return @cb()

		@$el.addClass('show-preloader')

		CodeWordTransitioner.in @$codeWord, 'white', false, @hide

		null

	onShowComplete : =>

		@cb?()

		null

	hide : =>

		@animateOut @onHideComplete

		null

	onHideComplete : =>

		@$el.removeClass('show-preloader')
		@cb?()

		null

	animateOut : (cb) =>

		# @animateCharsOut()

		# that'll do
		# setTimeout cb, 2200

		setTimeout =>
			CodeWordTransitioner.scramble @$codeWord, 'white', false, cb
		, 2000

		null

	animateCharsOut : =>

		@$codeWord.find('[data-codetext-char]').each (i, el) =>

			$el = $(el)

			$el.addClass('hide-border')

			delay        = 1 + (_.random(50, 200) / 1000)
			displacement = _.random(20, 30)
			rotation     = (displacement / 30) * 50
			rotation     = if (Math.random() > 0.5) then rotation else -rotation

			TweenLite.to $el, 1, { delay : delay, opacity : 0, y : displacement, rotation : "#{rotation}deg", ease : Cubic.easeIn }

		null

module.exports = Preloader
