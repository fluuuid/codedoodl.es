crypto      = require "crypto"
bodyParser  = require "body-parser"
credentials = require "../../credentials"

requestIsFromGithub = (req) ->

	secret = credentials.GITHUB_SECRET

	hash   = crypto.createHmac('sha1', secret).update(JSON.stringify(req.body)).digest('hex')
	hubSig = (req.headers['x-hub-signature'] or '').replace('sha1=', '')

	hash is hubSig

test = (req, res) ->

	console.log "received test hook at #{new Date().toString()}"
	console.log req.body

	if requestIsFromGithub req
		res.json "success! from github!"
	else
		res.json "nope, not github"

setup = (app) ->

	app.use bodyParser()

	app.post '/hooks/test', test

module.exports = setup
