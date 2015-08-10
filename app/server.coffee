express  = require "express"
compress = require "compression"
path     = require "path"
app      = express()

gzipExtRegex = /\.(css|js|svg|gz|html|xml|json)(?:$|\?)/
gzipStaticAssets = (req, res, next) ->
    if gzipExtRegex.test req.url
        res.set 'Content-Encoding', 'gzip'
    next()

forceNonWww = (req, res, next) ->
	if req.headers.host.match(/^www/) isnt null
		res.redirect 301, 'http://' + req.headers.host.replace(/^www\./, '') + req.url
	else
		next()

app.set "views", __dirname
app.engine 'html', require('ejs').renderFile
app.set 'view engine', 'html'
app.use compress()

[
	"./api/routes",
	"./site/routes",
	"./hooks/routes"
].forEach (routePath) ->
	require(routePath)(app)

app.use forceNonWww
app.use gzipStaticAssets
app.use express.static(__dirname + '/public')
app.use require("./middleware").notFound

module.exports = app
