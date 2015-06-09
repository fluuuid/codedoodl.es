# config  = require "../config/server"
express = require "express"
path = require "path"
app     = express()

gzipExtRegex = /\.(css|js|svg|gz|html|xml|json)(?:$|\?)/
gzipStaticAssets = (req, res, next) ->
    if gzipExtRegex.test req.url
        res.set 'Content-Encoding', 'gzip'
    next()

app.set "views", __dirname
app.engine 'html', require('ejs').renderFile
app.set 'view engine', 'html'

[
	"./api/routes",
	"./site/routes",
	"./hooks/routes"
].forEach (routePath) ->
	require(routePath)(app)

app.use gzipStaticAssets
app.use(express.static(__dirname + '/public'))

app.use require("./middleware").notFound

module.exports = app
