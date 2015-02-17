#!/usr/bin/env node

config  = require "../config/server"
express = require "express"
app     = express()

log = require("winston").loggers.get("app:server")

app.set "views", __dirname
app.engine 'html', require('ejs').renderFile
app.set 'view engine', 'html'

[
	"./api/routes",
	"./site/routes"
].forEach (routePath) ->
	require(routePath)(app)

app.use(express.static(__dirname + '/public'))

app.use require("./middleware").notFound

app.listen config.express.port, config.express.ip, (error) ->
	if error
		log.error("Unable to listen for connections", error)
		process.exit(10)

	log.info("express is listening on " + config.BASE_PATH);
