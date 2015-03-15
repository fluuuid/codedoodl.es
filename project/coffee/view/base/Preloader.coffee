AbstractView = require '../AbstractView'

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

		@setupChars()

		null

	show : (@cb) =>

		console.log "show : (@cb) =>"

		@$el.addClass('show-preloader')

		@animateCharsIn @hide

		null

	onShowComplete : =>

		@cb?()

		null

	hide : (@cb) =>

		@animateCharsOut @onHideComplete

		null

	onHideComplete : =>

		@$el.removeClass('show-preloader')
		@cb?()

		null

	setupChars : =>

		@chars = []
		
		@$el.find('[data-codetext-char]').each (i, el) =>

			$el = $(el)

			@chars.push
				$el        : $el
				rightChar  : $el.attr('data-codetext-char')
				wrongChars : @_getRandomWrongChars()

		null

	_getRandomWrongChars : =>

		chars = []

		charCount = _.random @MIN_WRONG_CHARS, @MAX_WRONG_CHARS

		for i in [0...charCount]
			chars.push
				char     : @_getRandomChar()
				inDelay  : _.random @MIN_CHAR_IN_DELAY, @MAX_CHAR_IN_DELAY
				outDelay : _.random @MIN_CHAR_OUT_DELAY, @MAX_CHAR_OUT_DELAY

		chars

	_getRandomChar : =>

		char = @CHARS[ _.random(0, @CHARS.length-1) ]

		char

	animateCharsIn : (cb) =>

		activeChar = 0

		@_animateCharIn activeChar, cb

		null

	_animateCharIn : (idx, cb) =>

		char = @chars[idx]

		@_animateWrongCharsIn char, =>

			if idx is @chars.length-1
				@animateCharsInDone cb
			else
				@_animateCharIn idx+1, cb

		null

	_animateWrongCharsIn : (char, cb) =>

		if char.wrongChars.length

			wrongChar = char.wrongChars.shift()

			setTimeout =>
				char.$el.html wrongChar.char

				setTimeout =>
					# char.$el.html ''
					@_animateWrongCharsIn char, cb
				, wrongChar.outDelay

			, wrongChar.inDelay

		else

			char.$el.html char.rightChar
			cb()

		null

	animateCharsInDone : (cb) =>

		console.log "animateCharsInDone : =>"

		cb()

		null

	animateCharsOut : (cb) =>

		for char in @chars

			char.$el.addClass('hide-border')

			displacement = _.random(20, 30)
			rotation     = (displacement / 30) * 50
			rotation     = if (Math.random() > 0.5) then rotation else -rotation

			TweenLite.to char.$el, 1, { delay : 1+((_.random(50, 200))/1000), opacity: 0, y : displacement, rotation: "#{rotation}deg", ease: Cubic.easeIn }

		setTimeout cb, 2200

		null

module.exports = Preloader
