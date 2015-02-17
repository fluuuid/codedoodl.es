doodleData = require '../../utils/getDoodleData'

getDoodles = (req, res) ->

	res.json doodleData.getDoodles()

getContributors = (req, res) ->

	res.json doodleData.getContributors()

setup = (app) ->

	app.get '/api/doodles', getDoodles
	app.get '/api/contributors', getContributors

module.exports = setup
