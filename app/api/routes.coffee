cors       = require "cors"
doodleData = require "../utils/getDoodleData"

getDoodles = (req, res) ->

	res.json doodles : doodleData.getDoodles()

getContributors = (req, res) ->

	res.json contributors : doodleData.getContributors()

setup = (app) ->

	app.get '/api/doodles', cors(), getDoodles
	app.get '/api/contributors', cors(), getContributors

module.exports = setup
