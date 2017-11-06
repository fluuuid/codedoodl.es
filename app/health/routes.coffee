config = require '../../config/server'

healthCheck = (req, res) ->
	return res.send 200

setup = (app) ->
	app.get "/#{config.routes.HEALTH}", healthCheck

module.exports = setup
