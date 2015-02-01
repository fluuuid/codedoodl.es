AbstractView = require '../AbstractView'

class Preloader extends AbstractView
	
	cb              : null
	
	TRANSITION_TIME : 0.5

	constructor : ->

		@setElement $('#preloader')

		super()

		return null

	init : =>

		null

	show : (@cb) =>

		@$el.css 'display' : 'block'

		null

	onShowComplete : =>

		@cb?()

		null

	hide : (@cb) =>

		@onHideComplete()

		null

	onHideComplete : =>

		@$el.css 'display' : 'none'
		@cb?()

		null

module.exports = Preloader
