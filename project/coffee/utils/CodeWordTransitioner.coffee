encode = require 'ent/encode'

class CodeWordTransitioner

	@config :
		MIN_WRONG_CHARS : 1
		MAX_WRONG_CHARS : 7

		MIN_CHAR_IN_DELAY : 40
		MAX_CHAR_IN_DELAY : 70

		MIN_CHAR_OUT_DELAY : 40
		MAX_CHAR_OUT_DELAY : 70

		CHARS : 'abcdefhijklmnopqrstuvwxyz0123456789!?*()@£$%^&_-+=[]{}:;\'"\\|<>,./~`'.split('').map((char) => return encode(char))

		CHAR_TEMPLATE : "<span data-codetext-char=\"{{ char }}\" data-codetext-char-state=\"{{ state }}\">{{ char }}</span>"

	@_wordCache : {}

	@_getWordFromCache : ($el, initialState=null) =>

		id = $el.attr('data-codeword-id')

		if id and @_wordCache[ id ]
			word = @_wordCache[ id ]
		else
			@_wrapChars $el, initialState
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
			word    : _.pluck(chars, 'rightChar').join('')
			$el     : $el
			chars   : chars
			visible : true

		@_wordCache[ id ]

	@_wrapChars : ($el, initialState=null) =>

		chars = $el.text().split('')
		state = initialState or $el.attr('data-codeword-initial-state') or ""
		html = []
		for char in chars
			html.push @_supplantString @config.CHAR_TEMPLATE, char : char, state: state

		$el.html html.join('')

		null

	# @param target = 'right', 'wrong', 'empty'
	@_prepareWord : (word, target, charState='') =>

		for char, i in word.chars

			targetChar = switch true
				when target is 'right' then char.rightChar
				when target is 'wrong' then @_getRandomChar()
				when target is 'empty' then ''
				else target.charAt(i) or ''

			if targetChar is ' ' then targetChar = '&nbsp;'

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

	@_getLongestCharDuration : (chars) =>

		longestTime = 0
		longestTimeIdx = 0

		for char, i in chars

			time = 0
			(time += wrongChar.inDelay + wrongChar.outDelay) for wrongChar in char.wrongChars
			if time > longestTime
				longestTime = time
				longestTimeIdx = i

		longestTimeIdx

	@_animateChars : (word, sequential, cb) =>

		activeChar = 0

		if sequential
			@_animateChar word.chars, activeChar, true, cb
		else
			longestCharIdx = @_getLongestCharDuration word.chars
			for char, i in word.chars
				args = [ word.chars, i, false ]
				if i is longestCharIdx then args.push cb
				@_animateChar.apply @, args

		null

	@_animateChar : (chars, idx, recurse, cb) =>

		char = chars[idx]

		if recurse

			@_animateWrongChars char, =>

				if idx is chars.length-1
					@_animateCharsDone cb
				else
					@_animateChar chars, idx+1, recurse, cb

		else

			if typeof cb is 'function'
				@_animateWrongChars char, => @_animateCharsDone cb
			else
				@_animateWrongChars char

		null

	@_animateWrongChars : (char, cb) =>

		if char.wrongChars.length

			wrongChar = char.wrongChars.shift()

			setTimeout =>
				char.$el.html wrongChar.char

				setTimeout =>
					@_animateWrongChars char, cb
				, wrongChar.outDelay

			, wrongChar.inDelay

		else

			char.$el
				.attr('data-codetext-char-state', char.charState)
				.html(char.targetChar)

			cb?()

		null

	@_animateCharsDone : (cb) =>

		cb?()

		null

	@_supplantString : (str, vals) =>

		return str.replace /{{ ([^{}]*) }}/g, (a, b) =>
			r = vals[b]
			(if typeof r is "string" or typeof r is "number" then r else a)

	@to : (targetText, $el, charState, sequential=false, cb=null) =>

		if _.isArray $el
			(@to(targetText, _$el, charState, cb)) for _$el in $el
			return

		word = @_getWordFromCache $el
		word.visible = true

		@_prepareWord word, targetText, charState
		@_animateChars word, sequential, cb

		null

	@in : ($el, charState, sequential=false, cb=null) =>

		if _.isArray $el
			(@in(_$el, charState, cb)) for _$el in $el
			return

		word = @_getWordFromCache $el
		word.visible = true

		@_prepareWord word, 'right', charState
		@_animateChars word, sequential, cb

		null

	@out : ($el, charState, sequential=false, cb=null) =>

		if _.isArray $el
			(@out(_$el, charState, cb)) for _$el in $el
			return

		word = @_getWordFromCache $el
		return if !word.visible

		word.visible = false

		@_prepareWord word, 'empty', charState
		@_animateChars word, sequential, cb

		null

	@scramble : ($el, charState, sequential=false, cb=null) =>

		if _.isArray $el
			(@scramble(_$el, charState, cb)) for _$el in $el
			return

		word = @_getWordFromCache $el

		return if !word.visible

		@_prepareWord word, 'wrong', charState
		@_animateChars word, sequential, cb

		null

	@unscramble : ($el, charState, sequential=false, cb=null) =>

		if _.isArray $el
			(@unscramble(_$el, charState, cb)) for _$el in $el
			return

		word = @_getWordFromCache $el

		return if !word.visible

		@_prepareWord word, 'right', charState
		@_animateChars word, sequential, cb

		null

	@prepare : ($el, initialState) =>

		if _.isArray $el
			(@prepare(_$el, initialState)) for _$el in $el
			return

		@_getWordFromCache $el, initialState

		null

	@getScrambledWord : (word) =>

		newChars = []
		(newChars.push @_getRandomChar()) for char in word.split('')

		return newChars.join('')

module.exports = CodeWordTransitioner
