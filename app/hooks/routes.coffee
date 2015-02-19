bodyParser = require "body-parser"

test = (req, res) ->

	console.log "received test hook at #{new Date().toString()}"
	console.log req.body

	res.json "success!"

setup = (app) ->

	app.use bodyParser()

	app.post '/hooks/test', test

module.exports = setup
