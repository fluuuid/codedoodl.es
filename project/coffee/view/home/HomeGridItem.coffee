AbstractView         = require '../AbstractView'
HomeView             = require './HomeView'
CodeWordTransitioner = require '../../utils/CodeWordTransitioner'
MediaQueries         = require '../../utils/MediaQueries'

class HomeGridItem extends AbstractView

	template : 'home-grid-item'

	visible : false

	offset       : 0

	maxOffset    : null
	acceleration : null
	ease         : null

	ITEM_MIN_OFFSET : 50
	ITEM_MAX_OFFSET : 200
	# ITEM_MIN_ACCEL  : 5
	# ITEM_MAX_ACCEL  : 50
	ITEM_MIN_EASE   : 100
	ITEM_MAX_EASE   : 400

	constructor : (@model, @parentGrid) ->

		@templateVars = _.extend {
			thumbSrc   : @getThumbSrc()
			videoSrc   : @getVideoSrc()
			videoCover : @getVideoCover()
		}, @model.toJSON()

		# @maxOffset    = (_.random @ITEM_MIN_OFFSET, @ITEM_MAX_OFFSET) / 10
		# @acceleration = (_.random @ITEM_MIN_ACCEL, @ITEM_MAX_ACCEL) / 10
		# @ease         = (_.random @ITEM_MIN_EASE, @ITEM_MAX_EASE) / 100

		super

		return null

	getThumbSrc : =>

		return @CD().DOODLES_URL + '/' + @model.get('slug') + '/thumb.jpg'

	getVideoSrc : =>

		if MediaQueries.getBreakpoint() is "Small" then return false

		type = @getVideoType()

		return @CD().DOODLES_URL + '/' + @model.get('slug') + '/thumb.' + type

	getVideoType : =>

		type = false

		if Modernizr.video.webm is 'probably'
			type = 'webm'
		else if Modernizr.video.h264 is 'probably'
			type = 'mp4'

		type

	getVideoCover : =>

		return @CD().DOODLES_URL + '/' + @model.get('slug') + '/video-cover.jpg'

	setOffsetAndEase : (idx, colCount) =>

		# idx = @CD().appData.doodles.indexOf @model
		@maxOffset = (((idx % colCount) + 1) * @ITEM_MIN_OFFSET) / 10
		@ease = (((idx % colCount) + 1) * @ITEM_MIN_EASE) / 100

		null

	init : =>

		@$authorName = @$el.find('[data-codeword="author_name"]')
		@$doodleName = @$el.find('[data-codeword="name"]')
		@$video      = @$el.find('[data-video]')

		null

	setListeners : (setting) =>

		if !Modernizr.touch
			@$el[setting] 'mouseover', @onMouseOver
			@$el[setting] 'mouseout', @onMouseOut
		# @parentGrid[setting] @parentGrid.EVENT_TICK, @onTick

		null

	show : (animateText=false) =>

		@visible = true
		@$el.addClass 'show-item'

		if animateText
			CodeWordTransitioner.to @model.get('author.name'), @$authorName, 'blue'
			CodeWordTransitioner.to @model.get('name'), @$doodleName, 'blue'

		# @setListeners 'on'

		null

	hide : =>

		@visible = false
		@$el.removeClass 'show-item'

		null

	onMouseOver : =>

		return if @parentGrid.isScrolling

		CodeWordTransitioner.to @model.get('author.name'), @$authorName, 'blue'
		CodeWordTransitioner.to @model.get('name'), @$doodleName, 'blue'

		@$video[0].play()

		null

	onMouseOut : =>

		@$video[0].pause()

		null

	onTick : (scrollDelta) =>

		# if !@visible then return @offset = 0

		scrollDelta = scrollDelta *= 0.4

		# maxDelta = 100
		if scrollDelta > @maxOffset
			scrollDelta = @maxOffset
		else if scrollDelta < -@maxOffset
			scrollDelta = -@maxOffset
		else
			scrollDelta = (scrollDelta / @maxOffset) * @maxOffset

		# factor = scrollDelta / maxDelta

		# @offset = @offset -= (@acceleration * factor)
		# if scrollDelta > 1
		# 	@offset -= @acceleration
		# else if scrollDelta < -1
		# 	@offset += @acceleration
		# else if @offset > 1
		# 	@offset -= @acceleration
		# else if @offset < -1
		# 	@offset += @acceleration
		# else
		# 	@offset = 0

		# @offset = factor * @maxOffset
		# if @offset <= 1 and @offset >= -1 then @offset = 0

		@offset = scrollDelta * @ease

		# console.log "updateDrag : (scrollDelta) =>", @offset

		@$el.css 'transform' : @CSSTranslate 0, @offset, 'px'

		null

module.exports = HomeGridItem
