AbstractData = require '../data/AbstractData'

###

Google+ SDK wrapper - load asynchronously, some helper methods

###
class GooglePlus extends AbstractData

	@url      : 'https://apis.google.com/js/client:plusone.js'

	@params   :
		'clientid'     : null
		'callback'     : null
		'scope'        : 'https://www.googleapis.com/auth/userinfo.email'
		'cookiepolicy' : 'none'

	@$dataDfd : null
	@loaded   : false

	@load : =>

		###
		TO DO
		include script loader with callback to :init
		###
		# require [@url], @init

		null

	@init : =>

		@loaded = true

		@params['clientid'] = window.config.gp_app_id
		@params['callback'] = @loginCallback

		null

	@login : (@$dataDfd) =>

		if @loaded
			gapi.auth.signIn @params
		else
			@$dataDfd.reject 'SDK not loaded'

		null

	@loginCallback : (res) =>

		if res['status']['signed_in']
			@getUserData res['access_token']
		else if res['error']['access_denied']
			@$dataDfd.reject 'no way jose'

		null

	@getUserData : (token) =>

		gapi.client.load 'plus','v1', =>

			request = gapi.client.plus.people.get 'userId': 'me'
			request.execute (res) =>

				userData =
					access_token : token
					full_name    : res.displayName
					social_id    : res.id
					email        : if res.emails[0] then res.emails[0].value else false
					profile_pic  : res.image.url

				@$dataDfd.resolve userData

		null

module.exports = GooglePlus
