AbstractModal = require './AbstractModal'

class OrientationModal extends AbstractModal

	name     : 'orientationModal'
	template : 'orientation-modal'

	cb       : null

	constructor : (@cb) ->

		@templateVars = {@name}

		super()

		return null

	init : =>

		null

	hide : (stillLandscape=true) =>

		@animateOut =>
			@CD().appView.remove @
			if !stillLandscape then @cb?()

		null

	setListeners : (setting) =>

		super

		@CD().appView[setting] 'updateDims', @onUpdateDims
		@$el[setting] 'touchend click', @hide

		null

	onUpdateDims : (dims) =>

		if dims.o is 'portrait' then @hide false

		null

module.exports = OrientationModal
