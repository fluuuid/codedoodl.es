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

		@getContributorsContent()

		super

		null

	getWhatContent : =>

		contribute_url = @CD().BASE_URL + '/' + @CD().nav.sections.CONTRIBUTE

		return @supplantString @CD().locale.get("about_content_what"), { contribute_url : contribute_url }, false

	getContributorsContent : =>

		r = Requester.request
            url  : API.get('contributors')
            type : 'GET'

        r.done (res) =>
        	@contributors.reset res.contributors
        	@$el.find('[data-contributors]').html @contributors.getAboutHTML()

        r.fail (res) => console.error "problem getting the contributors", res

		null

module.exports = AboutPageView
