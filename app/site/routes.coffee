_            = require 'underscore'
bodyParser   = require "body-parser"
cookieParser = require "cookie-parser"
session      = require "express-session"
config       = require '../../config/server'
content      = require '../content/all.json'

###
views
###
home = (req, res) ->
	res.render "site/index", _.extend content.home, config : config

about = (req, res) ->
	res.render "site/index", _.extend content.home, config : config

contribute = (req, res) ->
	res.render "site/index", _.extend content.home, config : config

doodles = (req, res) ->
	if !req.params.authorName or !req.params.doodleName
		return res.redirect 301, "/#{config.routes.HOME}"
	res.render "site/index", _.extend content.home, config : config

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
	app.get "/#{config.routes.DOODLES}/:authorName/:doodleName", doodles

module.exports = setup
