AbstractViewPage       = require '../AbstractViewPage'
ContributorsCollection = require '../../collections/contributors/ContributorsCollection'
Requester              = require '../../utils/Requester'
API                    = require '../../data/API'

class AboutPageView extends AbstractViewPage

	template : 'page-about'

	constructor : ->

		@contributors = new ContributorsCollection

		@templateVars = 
			label_what      : @CD().locale.get "about_label_what"
			content_what    : @getWhatContent()
			label_contact   : @CD().locale.get "about_label_contact"
			content_contact : @CD().locale.get "about_content_contact"
			label_who       : @CD().locale.get "about_label_who"

		super

		return null

	show : =>

		@getContributorsContent() if !@contributors.length

		super

		null

	getWhatContent : =>

		vars =
			contribute_url : @CD().BASE_URL + '/' + @CD().nav.sections.CONTRIBUTE
			extension_url  : window.config.extension_url

		return @supplantString @CD().locale.get("about_content_what"), vars, false

	getContributorsContent : =>

		r = Requester.request
            url  : API.get('contributors')
            type : 'GET'

        r.done (res) =>
        	@contributors.reset _.shuffle res.contributors
        	@$el.find('[data-contributors]').html @CD().locale.get("about_content_who") + @contributors.getAboutHTML()

        r.fail (res) => console.error "problem getting the contributors", res

		null

module.exports = AboutPageView
