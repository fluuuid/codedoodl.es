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
			content_what    : @CD().locale.get "about_content_what"
			label_contact   : @CD().locale.get "about_label_contact"
			content_contact : @CD().locale.get "about_content_contact"
			label_who       : @CD().locale.get "about_label_who"

		super

		@getContributorsContent()

		return null

	getContributorsContent : =>

		r = Requester.request
            # url  : API.get('start')
            url  : @CD().BASE_URL + '/data/_DUMMY/contributors.json'
            type : 'GET'

        r.done (res) =>
        	@contributors.add res.contributors
        	@$el.find('[data-contributors]').html @contributors.getAboutHTML()

        r.fail (res) => console.error "problem getting the contributors", res

		null

module.exports = AboutPageView
