# Here's a set of routes for the full HTML pages on our site
_       = require 'underscore'
config  = require '../../config/server'
content = require '../content/all.json'

home = (req, res) ->
	res.render "site/index", _.extend content.home, config : config

about = (req, res) ->
	res.render "site/index", _.extend content.home, config : config

contribute = (req, res) ->
	res.render "site/index", _.extend content.home, config : config

setup = (app) ->
	app.get '/', home
	app.get '/about', about
	app.get '/contribute', contribute

module.exports = setup
