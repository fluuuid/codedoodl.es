AbstractView = require './AbstractView'

class AbstractViewModal extends AbstractView

	_shown     : false
	_listening : false

	TRANSITION_TIME : 0.3

	show : (cb) =>

		return unless !@_shown
		@_shown = true

		@CD().appView.wrapper.addChild @

		@animateIn cb

		null

	hide : (cb) =>

		return unless @_shown
		@_shown = false
		
		@animateOut cb

		null

	dispose : =>

		@callChildrenAndSelf 'setListeners', 'off'

		null

	setListeners : (setting) =>

		return 'noListenerChange' unless setting isnt @_listening
		@_listening = setting

		@$el[setting] 'click', '[data-close-modal]', @onCloseClick

		null

	onCloseClick : (e) =>

		e.preventDefault()
		@close()

		null

	close : =>

		@CD().router.navigateTo @CD().appView.wrapper.backgroundView.route

		null

	animateIn : (cb) =>

		@$el.css 'visibility' : 'visible'

		TweenLite.fromTo @$el, @TRANSITION_TIME, { 'transform'  : @CSSTranslate(-50, -45), 'opacity' : 0 }, { 'transform': @CSSTranslate(-50, -50), 'opacity': 1, ease : Cubic.easeInOut, onComplete : @animateInDone, onCompleteParams : [cb] }

		null

	animateInDone : (cb) =>

		@callChildrenAndSelf 'setListeners', 'on'

		cb?()

		@CD().appView.modalPlayBtn.show()

		null

	animateOut : (cb) =>

		@CD().appView.modalPlayBtn.hide()

		TweenLite.to @$el, @TRANSITION_TIME, { 'transform': @CSSTranslate(-50, -55), 'opacity': 0, ease : Cubic.easeInOut, onComplete : @animateOutDone, onCompleteParams : [cb] }

		null

	animateOutDone : (cb) =>

		@$el.css 'visibility' : 'hidden'

		@CD().appView.wrapper.remove @

		cb?()

		null

module.exports = AbstractViewModal
