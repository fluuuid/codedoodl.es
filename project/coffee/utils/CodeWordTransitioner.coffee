class CodeWordTransitioner

	@config :
		MIN_WRONG_CHARS : 0
		MAX_WRONG_CHARS : 4

		MIN_CHAR_IN_DELAY : 30
		MAX_CHAR_IN_DELAY : 100

		MIN_CHAR_OUT_DELAY : 30
		MAX_CHAR_OUT_DELAY : 100

		CHARS : 'abcdefhijklmnopqrstuvwxyz0123456789!?*()@£$%^&_-+=[]{}:;\'"\\|<>,./~`'.split('')

		CHAR_TEMPLATE : "<span data-codetext-char=\"{{ char }}\">{{ char }}</span>"

	@_wordCache : {}

	@_getWordFromCache : ($el) =>

		id = $el.attr('data-codeword-id')

		if id and @_wordCache[ id ]
			word = @_wordCache[ id ]
		else
			@_wrapChars $el
			word = @_addWordToCache $el

		word

	@_addWordToCache : ($el) =>

		chars = []

		$el.find('[data-codetext-char]').each (i, el) =>
			$charEl = $(el)
			chars.push
				$el        : $charEl
				rightChar  : $charEl.attr('data-codetext-char')

		id = _.uniqueId()
		$el.attr 'data-codeword-id', id

		@_wordCache[ id ] =
			$el   : $el
			chars : chars

		@_wordCache[ id ]

	@_wrapChars : ($el) =>

		chars = $el.text().split('')
		html = []
		for char in chars
			html.push @_supplantString @config.CHAR_TEMPLATE, char : char

		$el.html html.join('')

		null

	# @param target = 'right', 'wrong', 'empty'
	@_prepareWord : (word, target, charState='') =>

		for char, i in word.chars

			targetChar = switch true
				when target is 'right' then char.rightChar
				when target is 'wrong' then @_getRandomChar()
				else ''

			char.wrongChars = @_getRandomWrongChars()
			char.targetChar = targetChar
			char.charState  = charState

		null

	@_getRandomWrongChars : =>

		chars = []

		charCount = _.random @config.MIN_WRONG_CHARS, @config.MAX_WRONG_CHARS

		for i in [0...charCount]
			chars.push
				char     : @_getRandomChar()
				inDelay  : _.random @config.MIN_CHAR_IN_DELAY, @config.MAX_CHAR_IN_DELAY
				outDelay : _.random @config.MIN_CHAR_OUT_DELAY, @config.MAX_CHAR_OUT_DELAY

		chars

	@_getRandomChar : =>

		char = @config.CHARS[ _.random(0, @config.CHARS.length-1) ]

		char

	@_animateChars : (word, cb) =>

		activeChar = 0

		@_animateChar word.chars, activeChar, cb

		null

	@_animateChar : (chars, idx, cb) =>

		char = chars[idx]

		@_animateWrongChars char, =>

			if idx is chars.length-1
				@_animateCharsDone cb
			else
				@_animateChar chars, idx+1, cb

		null

	@_animateWrongChars : (char, cb) =>

		char.$el.attr('data-codetext-char-state', char.charState)

		if char.wrongChars.length

			wrongChar = char.wrongChars.shift()

			setTimeout =>
				char.$el.html wrongChar.char

				setTimeout =>
					# char.$el.html ''
					@_animateWrongChars char, cb
				, wrongChar.outDelay

			, wrongChar.inDelay

		else

			char.$el.html char.targetChar

			cb()

		null

	@_animateCharsDone : (cb) =>

		console.log "_animateCharsDone : =>"

		cb?()

		null

	@_supplantString : (str, vals) =>

		return str.replace /{{ ([^{}]*) }}/g, (a, b) =>
			r = vals[b]
			(if typeof r is "string" or typeof r is "number" then r else a)

	@in : ($el, charState, cb) =>

		word = @_getWordFromCache $el
		@_prepareWord word, 'right', charState

		@_animateChars word, cb

		null

	@out : ($el, charState, cb) =>

		word = @_getWordFromCache $el
		@_prepareWord word, 'empty', charState

		@_animateChars word, cb

	@scramble : ($el, charState, cb) =>

		word = @_getWordFromCache $el
		@_prepareWord word, 'wrong', charState

		@_animateChars word, cb

		null

module.exports = CodeWordTransitioner

window.CodeWordTransitioner= CodeWordTransitioner
