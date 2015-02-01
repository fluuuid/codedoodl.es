AbstractView = require '../AbstractView'

class Header extends AbstractView

	template : 'site-header'

	constructor : ->

		@templateVars =
			desc    : @__NAMESPACE__().locale.get "header_desc"
			home    : 
				label    : 'Go to homepage'
				url      : @__NAMESPACE__().BASE_PATH + '/' + @__NAMESPACE__().nav.sections.HOME
			example : 
				label    : 'Go to example page'
				url      : @__NAMESPACE__().BASE_PATH + '/' + @__NAMESPACE__().nav.sections.EXAMPLE

		super()

		return null

module.exports = Header
