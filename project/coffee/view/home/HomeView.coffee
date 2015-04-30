AbstractViewPage = require '../AbstractViewPage'
HomeGridItem     = require './HomeGridItem'

class HomeView extends AbstractViewPage

	# manage state for homeView on per-session basis, allow number of
	# grid items, and scroll position of home grid to be persisted
	@visitedThisSession : false
	@gridItems : []
	@dims :
		item      : h: 268, w: 200, margin: 20, a: 0
		container : h: 0, w: 0, a: 0, pt: 25
	@colCount : 0
	@scrollDistance : 0

	@SHOW_ROW_THRESHOLD : 0.3 # how much of a grid row (scale 0 -> 1) must be visible before it is "shown"

	template      : 'page-home'
	addToSelector : '[data-home-grid]'

	allDoodles : null

	constructor : ->

		@templateVars = 
			desc : @CD().locale.get "home_desc"

		@allDoodles = @CD().appData.doodles

		super()

		@setupDims()
		@addGridItems()

		return null

	addGridItems : =>

		for doodle in @allDoodles.models

			item = new HomeGridItem doodle
			HomeView.gridItems.push item
			@addChild item

		null

	# positionGridItems : =>

	# 	for item, idx in HomeView.gridItems

	# 		top = (Math.floor(idx / HomeView.colCount) * HomeView.dims.item.h) + HomeView.dims.container.pt
	# 		left = ((idx % HomeView.colCount) * HomeView.dims.item.w) + (idx % HomeView.colCount) * HomeView.dims.item.margin

	# 		item.$el.css
	# 			'top': top
	# 			'left': left

	# 	@$grid.css 'height': Math.ceil(HomeView.gridItems.length / HomeView.colCount) * HomeView.dims.item.h

	# 	null

	init : =>

		@$grid = @$el.find('[data-home-grid]')

		null

	setupDims : =>

		gridWidth = @$grid.outerWidth()

		HomeView.colCount = Math.round gridWidth / HomeView.dims.item.w
		
		HomeView.dims.container =
			h: @CD().appView.dims.h, w: gridWidth, a: (@CD().appView.dims.h * gridWidth), pt: 25

		HomeView.dims.item.a = HomeView.dims.item.h * (HomeView.dims.item.w + ((HomeView.dims.item.margin * (HomeView.colCount - 1)) / HomeView.colCount))

		null

	setListeners : (setting) =>

		@CD().appView[setting] @CD().appView.EVENT_UPDATE_DIMENSIONS, @onResize
		@CD().appView[setting] @CD().appView.EVENT_ON_SCROLL, @onScroll

		null

	onResize : =>

		@setupDims()
		@onScroll()

		null

	onScroll : =>

		HomeView.scrollDistance = @CD().appView.lastScrollY

		# itemsToShow = @getRequiredDoodleCountByArea()
		# if itemsToShow > 0 then @addDoodles itemsToShow

		@checkItemsForVisibility()

		null

	show : =>

		super

		null

	animateIn : =>

		@setupDims()
		# @positionGridItems()

		if !HomeView.visitedThisSession
			# @addDoodles @getRequiredDoodleCountByArea(), true
			@onScroll()
			HomeView.visitedThisSession = true
		else
			@CD().appView.$window.scrollTop HomeView.scrollDistance

		null

	checkItemsForVisibility : =>

		for item, i in HomeView.gridItems

			position = @_getItemPositionDataByIndex i
			offset = item.maxOffset - (position.visibility * item.maxOffset)

			item.$el.css
				'visibility' : if position.visibility > 0 then 'visible' else 'hidden'
				'opacity' : if position.visibility > 0 then position.visibility + 0.3 else 0
				'transform' : "translate3d(0, #{position.transform}#{offset}px, 0)"

		null

	_getItemPositionDataByIndex : (idx) =>

		verticalOffset = (Math.floor(idx / HomeView.colCount) * HomeView.dims.item.h) + HomeView.dims.container.pt
		position = visibility: 1, transform: '+'

		if verticalOffset + HomeView.dims.item.h < HomeView.scrollDistance or verticalOffset > HomeView.scrollDistance + HomeView.dims.container.h
			position = visibility: 0, transform: '+'
		else if verticalOffset > HomeView.scrollDistance and verticalOffset + HomeView.dims.item.h < HomeView.scrollDistance + HomeView.dims.container.h
			position = visibility: 1, transform: '+'
		else if verticalOffset < HomeView.scrollDistance and verticalOffset + HomeView.dims.item.h > HomeView.scrollDistance
			perc = 1 - ((HomeView.scrollDistance - verticalOffset) / HomeView.dims.item.h)
			position = visibility: perc, transform: '-'
		else if verticalOffset < HomeView.scrollDistance + HomeView.dims.container.h and verticalOffset + HomeView.dims.item.h > HomeView.scrollDistance + HomeView.dims.container.h
			perc = ((HomeView.scrollDistance + HomeView.dims.container.h) - verticalOffset) / HomeView.dims.item.h
			position = visibility: perc, transform: '+'

		position

	getRequiredDoodleCountByArea : =>

		totalArea  = HomeView.dims.container.a + (HomeView.scrollDistance * HomeView.dims.container.w)
		targetRows = (totalArea / HomeView.dims.item.a) / HomeView.colCount

		targetItems = Math.floor(targetRows) * HomeView.colCount
		targetItems = if (targetRows % 1) > HomeView.SHOW_ROW_THRESHOLD then targetItems + HomeView.colCount else targetItems

		return targetItems - HomeView.gridItems.length

	addDoodles : (count, fullPageTransition=false) =>

		console.log "adding doodles... x#{count}"

		newItems = []

		for idx in [HomeView.gridItems.length...HomeView.gridItems.length+count]

			doodle = @allDoodles.at idx
			break if !doodle

			newItems.push new HomeGridItem doodle

		HomeView.gridItems = HomeView.gridItems.concat newItems

		for item, idx in newItems

			@addChild item
			@animateItemIn item, idx, fullPageTransition

		null

	animateItemIn : (item, index, fullPageTransition=false) =>

		duration   = 0.5
		fromParams = y : (if fullPageTransition then window.innerHeight else 0), opacity : 0, scale : 0.6
		toParams   = delay : (duration * 0.2) * index, y : 0, opacity : 1, scale : 1 , ease : Expo.easeOut, onComplete : item.show

		TweenLite.fromTo item.$el, duration, fromParams, toParams

		null

window.HomeView = HomeView

module.exports = HomeView
