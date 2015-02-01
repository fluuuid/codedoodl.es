AbstractView = require '../AbstractView'

class Header extends AbstractView

	template : 'site-header'

	constructor : ->

		@templateVars =
			desc    : @CD().locale.get "header_desc"
			home    : 
				label    : 'Go to homepage'
				url      : @CD().BASE_PATH + '/' + @CD().nav.sections.HOME
			about : 
				label    : 'Go to about page'
				url      : @CD().BASE_PATH + '/' + @CD().nav.sections.ABOUT
			contribute : 
				label    : 'Go to contribute page'
				url      : @CD().BASE_PATH + '/' + @CD().nav.sections.CONTRIBUTE

		super()

		return null

module.exports = Header
