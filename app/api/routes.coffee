cors       = require "cors"
doodleData = require "../../utils/getDoodleData"

DUMMY_DOODLES = require "../../project/data/_DUMMY/doodles.json"

getDoodles = (req, res) ->

	# res.json doodleData.getDoodles()
	res.json DUMMY_DOODLES

getContributors = (req, res) ->

	res.json doodleData.getContributors()

setup = (app) ->

	app.get '/api/doodles', cors(), getDoodles
	app.get '/api/contributors', cors(), getContributors

module.exports = setup
