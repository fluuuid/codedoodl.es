AbstractView = require '../AbstractView'

class Header extends AbstractView

	template : 'site-header'

	constructor : ->

		@templateVars =
			desc    : @CD().locale.get "header_desc"
			home    : 
				label    : 'Go to homepage'
				url      : @CD().BASE_PATH + '/' + @CD().nav.sections.HOME
			example : 
				label    : 'Go to example page'
				url      : @CD().BASE_PATH + '/' + @CD().nav.sections.EXAMPLE

		super()

		return null

module.exports = Header
