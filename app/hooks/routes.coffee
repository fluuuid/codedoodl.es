crypto     = require "crypto"
bodyParser = require "body-parser"
cloneRepo  = require "../../utils/cloneRepo"
deployer   = require "../../utils/deployer"
config     = require "../../config/repository"

requestIsFromGithub = (req) ->

	secret = process.env.GITHUB_SECRET or ''

	hash   = crypto.createHmac('sha1', secret).update(JSON.stringify(req.body)).digest('hex')
	hubSig = (req.headers['x-hub-signature'] or '').replace('sha1=', '')

	hash is hubSig

verifyHookSource = (req, res) ->

	if requestIsFromGithub req
		authorised = true
	else
		authorised = false

	authorised

detectChanges = (req) ->

	changed = app : false, data : false

	changedFiles = []
	(changedFiles = changedFiles.concat(commit.added).concat(commit.removed).concat(commit.modified)) for commit in req.body.commits

	for filePath in changedFiles
		if filePath.split('/')[0] is config.REPO_DOODLE_DIR or filePath.indexOf(config.REPO_DATA_DIR) is 0 then changed.data = true
		if filePath.split('/')[0] is config.REPO_APP_DIR then changed.app = true

	changed

getDeployType = (req) ->

	changed = detectChanges(req)

	type = switch true
		when changed.app and changed.data then 'deployAll'
		when changed.app then 'deployApp'
		when changed.data then 'deployData'
		else false

	type

push = (req, res) ->

	if !verifyHookSource(req, res) then return res.status(401).send "nope, not github"

	deployType = getDeployType(req)

	if !deployType then return res.json "no app or data changes to push..."

	deployer[deployType]();

	res.json "success! deployed with #{deployType}!"

setup = (app) ->

	app.use bodyParser()

	app.post '/hooks/push', push

module.exports = setup
