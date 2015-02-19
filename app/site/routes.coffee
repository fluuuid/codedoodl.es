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

###
basic password-protect
###
checkAuth = (req, res, next) ->
	if !req.session.logged_in
		res.redirect '/login'
	else
		next()

login = (req, res) ->
	msg = if req.query.wrong_pw isnt undefined then 'Wrong. Try again' else false
	res.render "site/login", msg: msg

loginPost = (req, res) ->
	if req.body.pw is process.env.DEV_PASSWORD
		req.session.logged_in = true
		res.redirect '/'
	else
		res.redirect '/login?wrong_pw'

setup = (app) ->
	app.use bodyParser()
	app.use cookieParser()
	app.use session({ secret: 'what up' })

	app.get '/login', login
	app.post '/login', loginPost
	app.get '*', checkAuth
	app.get '/', home
	app.get '/about', about
	app.get '/contribute', contribute

module.exports = setup
