AbstractView    = require '../AbstractView'
HomeView        = require '../home/HomeView'
ExamplePageView = require '../examplePage/ExamplePageView'
Nav             = require '../../router/Nav'

class Wrapper extends AbstractView

	VIEW_TYPE_PAGE  : 'page'
	VIEW_TYPE_MODAL : 'modal'

	template : 'wrapper'

	views          : null
	previousView   : null
	currentView    : null
	backgroundView : null

	constructor : ->

		@views =
			home    : classRef : HomeView,        route : @__NAMESPACE__().nav.sections.HOME,    view : null, type : @VIEW_TYPE_PAGE
			example : classRef : ExamplePageView, route : @__NAMESPACE__().nav.sections.EXAMPLE, view : null, type : @VIEW_TYPE_PAGE

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

	getViewByRoute : (route) =>

		for name, data of @views
			return @views[name] if route is @views[name].route

		null

	init : =>

		@__NAMESPACE__().appView.on 'start', @start

		null

	start : =>

		@__NAMESPACE__().appView.off 'start', @start

		@bindEvents()

		null

	bindEvents : =>

		@__NAMESPACE__().nav.on Nav.EVENT_CHANGE_VIEW, @changeView
		@__NAMESPACE__().nav.on Nav.EVENT_CHANGE_SUB_VIEW, @changeSubView

		null

	###

	THIS IS A MESS, SORT IT (neil)

	###
	changeView : (previous, current) =>

		@previousView = @getViewByRoute previous.area
		@currentView  = @getViewByRoute current.area

		if !@previousView

			if @currentView.type is @VIEW_TYPE_PAGE
				@transitionViews false, @currentView.view
			else if @currentView.type is @VIEW_TYPE_MODAL
				@backgroundView = @views.home
				@transitionViews false, @currentView.view, true

		else

			if @currentView.type is @VIEW_TYPE_PAGE and @previousView.type is @VIEW_TYPE_PAGE
				@transitionViews @previousView.view, @currentView.view
			else if @currentView.type is @VIEW_TYPE_MODAL and @previousView.type is @VIEW_TYPE_PAGE
				@backgroundView = @previousView
				@transitionViews false, @currentView.view, true
			else if @currentView.type is @VIEW_TYPE_PAGE and @previousView.type is @VIEW_TYPE_MODAL
				@backgroundView = @backgroundView or @views.home
				if @backgroundView isnt @currentView
					@transitionViews @previousView.view, @currentView.view, false, true
				else if @backgroundView is @currentView
					@transitionViews @previousView.view, false
			else if @currentView.type is @VIEW_TYPE_MODAL and @previousView.type is @VIEW_TYPE_MODAL
				@backgroundView = @backgroundView or @views.home
				@transitionViews @previousView.view, @currentView.view, true

		null

	changeSubView : (current) =>

		@currentView.view.trigger Nav.EVENT_CHANGE_SUB_VIEW, current.sub

		null

	transitionViews : (from, to, toModal=false, fromModal=false) =>

		return unless from isnt to

		if toModal then @backgroundView.view?.show()
		if fromModal then @backgroundView.view?.hide()

		if from and to
			from.hide to.show
		else if from
			from.hide()
		else if to
			to.show()

		null

module.exports = Wrapper
