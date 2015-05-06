#!/usr/bin/env node

cluster = require 'cluster'
config  = require "../config/server"
app     = require './server'

workers = {}
count   = require('os').cpus().length

log = require("winston").loggers.get("app:server")

spawn = ->
  worker = cluster.fork()
  workers[worker.pid] = worker
  return worker

if cluster.isMaster and process.env.NODE_ENV is 'production'

	(spawn()) for i in [0...count]

	cluster.on 'death', (worker) ->
		console.log 'worker ' + worker.pid + ' died. spawning a new process...'
		delete workers[worker.pid]
		spawn()

else

	app.listen config.express.port, config.express.ip, (error) ->
		if error
			log.error("Unable to listen for connections", error)
			process.exit(10)

		log.info("express is listening on " + config.BASE_URL);
