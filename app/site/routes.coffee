_               = require 'underscore'
bodyParser      = require 'body-parser'
cookieParser    = require 'cookie-parser'
session         = require 'express-session'
config          = require '../../config/server'
getTemplateData = require '../utils/getTemplateData'
Hashids         = require 'hashids'

###
views
###
home = (req, res) ->
	if req.session.logged_in
		res.render "site/index", getTemplateData('HOME')
	else
		res.render "site/holding", getTemplateData('HOLDING')

about = (req, res) ->
	res.render "site/index", getTemplateData('ABOUT')

contribute = (req, res) ->
	res.render "site/index", getTemplateData('CONTRIBUTE')

doodles = (req, res) ->
	if !req.params.authorName or !req.params.doodleName
		return res.redirect 301, "/#{config.routes.HOME}"
	res.render "site/index", getTemplateData('DOODLES')

checkShortLink = (req, res, next) ->
	segments = req.params.path.split('/')

	if segments.length is 1
		allDoodles = require('../../utils/getDoodleData').getDoodles().doodles
		hashids    = new Hashids config.shortlinks.SALT, 0, config.shortlinks.ALPHABET
		index      = hashids.decode(segments[0])[0]
		doodle     = _.findWhere allDoodles, index : index

		if doodle
			return res.redirect 301, "/#{config.routes.DOODLES}/#{doodle.slug}"

	next()

###
basic password-protect
###
checkAuth = (req, res, next) ->
	if !req.session.logged_in
		res.redirect "/#{config.routes.HOME}"
	else
		next()

login = (req, res) ->
	msg = if req.query.wrong_pw isnt undefined then 'Wrong. Try again' else false
	res.render "site/login", msg: msg

loginPost = (req, res) ->
	if req.body.pw is (process.env.DEV_PASSWORD or '')
		req.session.logged_in = true
		res.redirect '/'
	else
		res.redirect '/login?wrong_pw'

setup = (app) ->
	app.use bodyParser()
	app.use cookieParser()
	app.use session({ secret: 'what up' })

	app.get "/#{config.routes.LOGIN}", login
	app.post "/#{config.routes.LOGIN}", loginPost

	app.get "/#{config.routes.HOME}", home
	app.get "/#{config.routes.ABOUT}", checkAuth, about
	app.get "/#{config.routes.CONTRIBUTE}", checkAuth, contribute
	app.get "/#{config.routes.DOODLES}/:authorName?/:doodleName?", checkAuth, doodles

	app.get '/holding/*', (req, res, next) => res.sendfile "public#{req.url}"

	app.get '/:path(*)', checkShortLink
	app.get '*', checkAuth

module.exports = setup
