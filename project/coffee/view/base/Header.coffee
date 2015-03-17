AbstractView         = require '../AbstractView'
Router               = require '../../router/Router'
CodeWordTransitioner = require '../../utils/CodeWordTransitioner'

class Header extends AbstractView

	template : 'site-header'

	FIRST_HASHCHANGE : true

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
			info_label : @CD().locale.get('header_info_label')

		super()

		@bindEvents()

		return null

	init : =>

		@$codeWords = @$el.find('[data-codeword]')

		null

	bindEvents : =>

		@CD().router.on Router.EVENT_HASH_CHANGED, @onHashChange

		null

	onHashChange : (where) =>

		if @FIRST_HASHCHANGE
			@FIRST_HASHCHANGE = false
			return
		
		@onAreaChange where

		null

	onAreaChange : (section) =>

		section = section or 'home'
		colour  = switch section
			when 'home' then 'red'
			else 'blue'

		@$el.attr 'data-section', section

		@$codeWords.each (i, el) =>
			CodeWordTransitioner.in $(el), colour

		null

	animateTextIn : =>

		@onAreaChange @CD().nav.current.area

		null

module.exports = Header
