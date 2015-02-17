
getDoodles = (req, res) ->

	res.json doodles : ['sup']

setup = (app) ->

	app.get '/api/doodles', getDoodles

module.exports = setup
