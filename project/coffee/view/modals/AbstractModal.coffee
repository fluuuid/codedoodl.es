AbstractView = require '../AbstractView'

class AbstractModal extends AbstractView

	$window : null

	### override in individual classes ###
	name     : null
	template : null

	constructor : ->

		@$window = $(window)

		super()

		@__NAMESPACE__().appView.addChild @
		@setListeners 'on'
		@animateIn()

		return null

	hide : =>

		@animateOut => @__NAMESPACE__().appView.remove @

		null

	dispose : =>

		@setListeners 'off'
		@__NAMESPACE__().appView.modalManager.modals[@name].view = null

		null

	setListeners : (setting) =>

		@$window[setting] 'keyup', @onKeyUp
		@$('[data-close]')[setting] 'click', @closeClick

		null

	onKeyUp : (e) =>

		if e.keyCode is 27 then @hide()

		null

	animateIn : =>

		TweenLite.to @$el, 0.3, { 'visibility': 'visible', 'opacity': 1, ease : Quad.easeOut }
		TweenLite.to @$el.find('.inner'), 0.3, { delay : 0.15, 'transform': 'scale(1)', 'visibility': 'visible', 'opacity': 1, ease : Back.easeOut }

		null

	animateOut : (callback) =>

		TweenLite.to @$el, 0.3, { delay : 0.15, 'opacity': 0, ease : Quad.easeOut, onComplete: callback }
		TweenLite.to @$el.find('.inner'), 0.3, { 'transform': 'scale(0.8)', 'opacity': 0, ease : Back.easeIn }

		null

	closeClick: ( e ) =>

		e.preventDefault()

		@hide()

		null

module.exports = AbstractModal
