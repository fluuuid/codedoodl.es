AbstractViewPage = require '../AbstractViewPage'

class AboutPageView extends AbstractViewPage

	template : 'page-about'

	constructor : ->

		@templateVars = 
			label_what      : @CD().locale.get "about_label_what"
			content_what    : @getWhatContent()
			label_contact   : @CD().locale.get "about_label_contact"
			content_contact : @CD().locale.get "about_content_contact"
			label_sponsor   : @CD().locale.get "about_label_sponsor"
			content_sponsor : @getSponsorContent()

		super

		return null

	getWhatContent : =>

		vars =
			contribute_url : @CD().BASE_URL + '/' + @CD().nav.sections.CONTRIBUTE
			extension_url  : window.config.extension_url

		return @supplantString @CD().locale.get("about_content_what"), vars, false

	getSponsorContent : =>

		vars =
			assets_url : @CD().ASSETS_URL

		return @supplantString @CD().locale.get("about_content_sponsor"), vars, false

module.exports = AboutPageView
