config = module.exports

config.express =
	port : process.env.PORT or 3000
	ip   : "127.0.0.1"

config.express_preview =
	port : process.env.PORT or 3001
	ip   : "127.0.0.1"

config.PRODUCTION = process.env.NODE_ENV is "production"

config.buckets =
	ASSETS  : 'assets.codedoodl.es'
	SOURCE  : 'source.codedoodl.es'
	PENDING : 'pending.codedoodl.es'

config.cloudfront = 
	SOURCE : 'E252Z8ZC5VB7QS'
	ASSETS : 'E278GI4I3S1464'

config.BASE_URL           = if config.PRODUCTION then "http://codedoodl.es" else "http://#{config.express.ip}:#{config.express.port}"
config.ASSETS_BUCKET_URL  = if config.PRODUCTION then "http://#{config.buckets.ASSETS}" else "http://#{config.express.ip}:#{config.express.port}"
config.DOODLES_BUCKET_URL = "http://#{config.buckets.SOURCE}"

config.routes =
	HOME       : ''
	ABOUT      : 'about'
	CONTRIBUTE : 'contribute'
	DOODLES    : '_'
	LOGIN      : 'login'

config.shortlinks =
	SALT     : 'no need for this to be private I guess'
	ALPHABET : 'abcdefghijklmnopqrstuvwxyz'

config.GA_CODE = process.env.GOOGLE_ANALYTICS_CODE or ''
