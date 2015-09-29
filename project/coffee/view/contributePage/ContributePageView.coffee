AbstractViewPage = require '../AbstractViewPage'
ContributorsCollection = require '../../collections/contributors/ContributorsCollection'
Requester              = require '../../utils/Requester'
API                    = require '../../data/API'

class ContributePageView extends AbstractViewPage

	template : 'page-contribute'

	constructor : ->

		@contributors = new ContributorsCollection

		@templateVars = 
			label_submit    : @CD().locale.get "contribute_label_submit"
			content_submit  : @CD().locale.get "contribute_content_submit"
			label_contact   : @CD().locale.get "contribute_label_contact"
			content_contact : @CD().locale.get "contribute_content_contact"
			label_who       : @CD().locale.get "contribute_label_who"

		super

		return null

	show : =>

		@getContributorsContent() if !@contributors.length

		super

		null

	getContributorsContent : =>

		r = Requester.request
            url  : API.get('contributors')
            type : 'GET'

        r.done (res) =>
        	@contributors.reset _.shuffle res.contributors
        	@$el.find('[data-contributors]').html @CD().locale.get("contribute_content_who") + @contributors.getAboutHTML()

        r.fail (res) => console.error "problem getting the contributors", res

		null

module.exports = ContributePageView
