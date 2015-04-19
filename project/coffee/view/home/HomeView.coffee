AbstractViewPage = require '../AbstractViewPage'
HomeGridItem     = require './HomeGridItem'

class HomeView extends AbstractViewPage

	# manage state for homeView on per-session basis, allow number of
	# grid items, and scroll position of home grid to be persisted
	@visitedThisSession : false
	@gridItems : []
	@dims :
		item      : h: 268, w: 200, margin: 20, a: 0
		container : h: 0, w: 0, a: 0
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

		return null

	init : =>

		@$grid = @$el.find('[data-home-grid]')

		null

	setupDims : =>

		gridWidth = @$grid.outerWidth()

		HomeView.colCount = Math.round gridWidth / HomeView.dims.item.w
		
		HomeView.dims.container =
			h: @CD().appView.dims.h, w: gridWidth, a: (@CD().appView.dims.h * gridWidth)

		HomeView.dims.item.a = HomeView.dims.item.h * (HomeView.dims.item.w + ((HomeView.dims.item.margin * (HomeView.colCount - 1)) / HomeView.colCount))

		null

	setListeners : (setting) =>

		@CD().appView[setting] @CD().appView.EVENT_UPDATE_DIMENSIONS, @onResize
		@CD().appView[setting] @CD().appView.EVENT_ON_SCROLL, @onScroll

		null

	onResize : =>

		@setupDims()

		null

	onScroll : =>

		HomeView.scrollDistance = @CD().appView.lastScrollY

		itemsToShow = @getRequiredDoodleCountByArea()
		if itemsToShow > 0 then @addDoodles itemsToShow

		null

	show : =>

		super

		null

	animateIn : =>

		@setupDims()

		if !HomeView.visitedThisSession
			@addDoodles @getRequiredDoodleCountByArea(), true
			HomeView.visitedThisSession = true
		else
			@CD().appView.$window.scrollTop HomeView.scrollDistance

		null

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

			newItems.push new HomeGridItem doodle, fullPageTransition

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

module.exports = HomeView
