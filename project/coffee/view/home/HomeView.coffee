AbstractViewPage = require '../AbstractViewPage'
HomeGridItem     = require './HomeGridItem'

class HomeView extends AbstractViewPage

	# manage state for homeView on per-session basis, allow number of
	# grid items, and scroll position of home grid to be persisted
	@visitedThisSession : false
	@gridItems : []
	@dims :
		itemHeight      : 0
		containerHeight : 0

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

		@setupDims()

		null

	setupDims : =>

		null

	setListeners : (setting) =>

		@CD().appView[setting] @CD().appView.EVENT_UPDATE_DIMENSIONS, @onResize

		null

	onResize : =>

		HomeView.dims.containerHeight = @CD().appView.dims.h

		@setupDims()

		null

	show : =>

		super

		null

	animateIn : =>

		if !HomeView.visitedThisSession
			@addDoodles 15
			HomeView.visitedThisSession = true
		else
			console.log 'show what been done shown already'

		null

	addDoodles : (count) =>

		console.log "adding doodles... x#{count}"

		newItems = []

		for idx in [HomeView.gridItems.length...HomeView.gridItems.length+count]

			doodle = @allDoodles.at idx
			break if !doodle

			newItems.push new HomeGridItem doodle

		HomeView.gridItems = HomeView.gridItems.concat newItems

		for item, idx in newItems

			@addChild item
			@animateItemIn item, idx, true

		null

	animateItemIn : (item, index, fullPage=false) =>

		duration = 0.5
		fromParams = y : (if fullPage then window.innerHeight else 50), opacity : 0
		toParams = delay : (duration * 0.2) * index, y : 0, opacity : 1, ease : Expo.easeOut, onComplete : item.show
		TweenLite.fromTo item.$el, duration, fromParams, toParams

		null

module.exports = HomeView
