_            = require 'underscore'
bodyParser   = require 'body-parser'
cookieParser = require 'cookie-parser'
session      = require 'express-session'
config       = require '../../config/server'
locale       = require '../public/data/locales/strings.json'

getTemplateData = (route) ->

	return _.extend {},
		config     : config
		page_title : locale.strings.PAGE_TITLES.strings["page_title_#{route}"]

###
views
###
home = (req, res) ->
	res.render "site/index", getTemplateData('HOME')

about = (req, res) ->
	res.render "site/index", getTemplateData('ABOUT')

contribute = (req, res) ->
	res.render "site/index", getTemplateData('CONTRIBUTE')

doodles = (req, res) ->
	if !req.params.authorName or !req.params.doodleName
		return res.redirect 301, "/#{config.routes.HOME}"
	res.render "site/index", getTemplateData('DOODLES')

###
basic password-protect
###
checkAuth = (req, res, next) ->
	if !req.session.logged_in
		res.redirect "/#{config.routes.LOGIN}"
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
	app.get '*', checkAuth
	app.get "/#{config.routes.HOME}", home
	app.get "/#{config.routes.ABOUT}", about
	app.get "/#{config.routes.CONTRIBUTE}", contribute
	app.get "/#{config.routes.DOODLES}/:authorName?/:doodleName?", doodles

module.exports = setup
