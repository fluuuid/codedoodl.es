AbstractViewPage = require '../AbstractViewPage'

class FourOhFourPageView extends AbstractViewPage

	template : 'page-four-oh-four'

	constructor : ->

		@templateVars =
			text : @CD().locale.get "four_oh_four_page_text"

		super

		return null

module.exports = FourOhFourPageView
