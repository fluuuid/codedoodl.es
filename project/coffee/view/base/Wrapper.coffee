AbstractView       = require '../AbstractView'
HomeView           = require '../home/HomeView'
AboutPageView      = require '../aboutPage/AboutPageView'
ContributePageView = require '../contributePage/ContributePageView'
DoodlePageView     = require '../doodlePage/DoodlePageView'
FourOhFourPageView = require '../fourOhFourPage/FourOhFourPageView'
Nav                = require '../../router/Nav'

class Wrapper extends AbstractView

	VIEW_TYPE_PAGE  : 'page'

	template : 'wrapper'

	views          : null
	previousView   : null
	currentView    : null

	pageSwitchDfd : null

	constructor : ->

		@views =
			home       : classRef : HomeView,           route : @CD().nav.sections.HOME,       view : null, type : @VIEW_TYPE_PAGE
			about      : classRef : AboutPageView,      route : @CD().nav.sections.ABOUT,      view : null, type : @VIEW_TYPE_PAGE
			contribute : classRef : ContributePageView, route : @CD().nav.sections.CONTRIBUTE, view : null, type : @VIEW_TYPE_PAGE
			doodle     : classRef : DoodlePageView,     route : @CD().nav.sections.DOODLES,    view : null, type : @VIEW_TYPE_PAGE
			fourOhFour : classRef : FourOhFourPageView, route : false, view : null, type : @VIEW_TYPE_PAGE

		@createClasses()

		super()

		# decide if you want to add all core DOM up front, or add only when required, see comments in AbstractViewPage.coffee
		# @addClasses()

		return null

	createClasses : =>

		(@views[name].view = new @views[name].classRef) for name, data of @views

		null

	addClasses : =>

		 for name, data of @views
		 	if data.type is @VIEW_TYPE_PAGE then @addChild data.view

		null

	# getViewByRoute : (route) =>

	# 	for name, data of @views
	# 		view = @views[name] if route is @views[name].route

	# 	if !view then return @views.fourOhFour

	# 	view

	getViewByRoute : (route) =>

		for name, data of @views
			return @views[name] if route is @views[name].route

		if route then return @views.fourOhFour

		null

	init : =>

		@CD().appView.on 'start', @start

		null

	start : =>

		@CD().appView.off 'start', @start

		@bindEvents()
		@updateDims()

		null

	bindEvents : =>

		@CD().nav.on Nav.EVENT_CHANGE_VIEW, @changeView
		@CD().nav.on Nav.EVENT_CHANGE_SUB_VIEW, @changeSubView

		@CD().appView.on @CD().appView.EVENT_UPDATE_DIMENSIONS, @updateDims

		null

	updateDims : =>

		@$el.css 'min-height', @CD().appView.dims.h

		null

	changeView : (previous, current) =>

		if @pageSwitchDfd and @pageSwitchDfd.state() isnt 'resolved'
			do (previous, current) => @pageSwitchDfd.done => @changeView previous, current
			return

		@previousView = @getViewByRoute previous.area
		@currentView  = @getViewByRoute current.area

		if !@previousView
			@transitionViews false, @currentView
		else
			@transitionViews @previousView, @currentView

		null

	changeSubView : (current) =>

		@currentView.view.trigger Nav.EVENT_CHANGE_SUB_VIEW, current.sub

		null

	transitionViews : (from, to) =>

		@pageSwitchDfd = $.Deferred()

		if from and to
			@CD().appView.transitioner.prepare from.route, to.route
			@CD().appView.transitioner.in => from.view.hide => to.view.show => @CD().appView.transitioner.out => @pageSwitchDfd.resolve()
		else if from
			from.view.hide @pageSwitchDfd.resolve
		else if to
			to.view.show @pageSwitchDfd.resolve

		null

module.exports = Wrapper
