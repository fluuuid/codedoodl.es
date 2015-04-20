AbstractCollection = require '../AbstractCollection'
ContributorModel   = require '../../models/contributor/ContributorModel'

class ContributorsCollection extends AbstractCollection

	model : ContributorModel

	getAboutHTML : =>

		peeps = []

		(peeps.push model.get('html')) for model in @models

		peeps.join(' \\ ')

module.exports = ContributorsCollection
