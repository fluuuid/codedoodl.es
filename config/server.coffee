config = module.exports

config.express =
	port : process.env.PORT or 3000
	ip   : "127.0.0.1"

config.express_preview =
	port : process.env.PORT or 3001
	ip   : "127.0.0.1"

config.PRODUCTION = process.env.NODE_ENV is "production"

config.buckets =
	ASSETS        : 'assets.codedoodl.es'
	SOURCE        : 'source.codedoodl.es'
	SOURCE_S3_URL : 's3-eu-west-1.amazonaws.com/source.codedoodl.es'
	PENDING       : 'pending.codedoodl.es'

config.cloudfront = 
	SOURCE : 'E252Z8ZC5VB7QS'
	ASSETS : 'E278GI4I3S1464'

config.EXTERNAL_URLS =
	form      : 'https://docs.google.com/forms/d/1K66OvKMiKqGjgmYRFUtEA43KZzBzv4KzObM1JtD4cbk/viewform'
	extension : 'https://chrome.google.com/webstore/detail/codedoodles/hhfnbfhcojlgbojpphigjibpjkccfikh'

config.BASE_URL           = if config.PRODUCTION then "http://codedoodl.es" else "http://#{config.express.ip}:#{config.express.port}"
config.ASSETS_BUCKET_URL  = if config.PRODUCTION then "http://#{config.buckets.ASSETS}" else "http://#{config.express.ip}:#{config.express.port}"
config.DOODLES_BUCKET_URL = "http://#{config.buckets.SOURCE}"

config.DOODLE_CACHE_TIMEOUT = if config.PRODUCTION then ((1000 * 60) * 5) else 0

config.routes =
	HOME       : ''
	ABOUT      : 'about'
	CONTRIBUTE : 'contribute'
	DOODLES    : '_'
	LOGIN      : 'login'
	FORM       : 'form'
	EXTENSION  : 'extension'
	HEALTH     : 'health'

config.shortlinks =
	SALT     : 'no need for this to be private I guess'
	ALPHABET : 'abcdefghijklmnopqrstuvwxyz'

config.GA_CODE            = process.env.GOOGLE_ANALYTICS_CODE or ''
config.PASSWORD           = process.env.DEV_PASSWORD or false
config.DOODLE_DATA_SOURCE = process.env.DOODLE_DATA_SOURCE
