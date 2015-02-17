config = module.exports

config.express =
	port : process.env.EXPRESS_PORT or 3000
	ip   : "127.0.0.1"

config.PRODUCTION = process.env.NODE_ENV is "production"
# add this when we have a production URL
config.BASE_PATH  = if config.PRODUCTION then "blah blah" else "http://#{config.express.ip}:#{config.express.port}"
