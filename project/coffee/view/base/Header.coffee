AbstractView = require '../AbstractView'
Router = require '../../router/Router'

class Header extends AbstractView

	template : 'site-header'

	constructor : ->

		@templateVars =
			home    : 
				label    : @CD().locale.get('header_logo_label')
				url      : @CD().BASE_PATH + '/' + @CD().nav.sections.HOME
			about : 
				label    : @CD().locale.get('header_about_label')
				url      : @CD().BASE_PATH + '/' + @CD().nav.sections.ABOUT
			contribute : 
				label    : @CD().locale.get('header_contribute_label')
				url      : @CD().BASE_PATH + '/' + @CD().nav.sections.CONTRIBUTE
			close_label : @CD().locale.get('header_close_label')

		super()

		@bindEvents()

		return null

	bindEvents : =>

		@CD().router.on Router.EVENT_HASH_CHANGED, @onHashChange

		null

	onHashChange : (where) =>

		where = where or 'home'
		@$el.attr 'data-section', where

		null

module.exports = Header
