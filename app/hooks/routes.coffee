crypto      = require "crypto"
bodyParser  = require "body-parser"

requestIsFromGithub = (req) ->

	secret = process.env.GITHUB_SECRET or ''

	hash   = crypto.createHmac('sha1', secret).update(JSON.stringify(req.body)).digest('hex')
	hubSig = (req.headers['x-hub-signature'] or '').replace('sha1=', '')

	hash is hubSig

verifyHookSource = (req, res) ->

	if requestIsFromGithub req
		authorised = true
	else
		res.status(401).send "nope, not github"	
		authorised = false

	authorised

push = (req, res) ->

	return unless verifyHookSource req, res

	res.json "success! from github!"

setup = (app) ->

	app.use bodyParser()

	app.post '/hooks/push', push

module.exports = setup
