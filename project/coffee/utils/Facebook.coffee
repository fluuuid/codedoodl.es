AbstractData = require '../data/AbstractData'

###

Facebook SDK wrapper - load asynchronously, some helper methods

###
class Facebook extends AbstractData

	@url         : '//connect.facebook.net/en_US/all.js'

	@permissions : 'email'

	@$dataDfd    : null
	@loaded      : false

	@load : =>

		###
		TO DO
		include script loader with callback to :init
		###
		# require [@url], @init

		null

	@init : =>

		@loaded = true

		FB.init
			appId  : window.config.fb_app_id
			status : false
			xfbml  : false

		null

	@login : (@$dataDfd) =>

		if !@loaded then return @$dataDfd.reject 'SDK not loaded'

		FB.login ( res ) =>

			if res['status'] is 'connected'
				@getUserData res['authResponse']['accessToken']
			else
				@$dataDfd.reject 'no way jose'

		, { scope: @permissions }

		null

	@getUserData : (token) =>

		userData = {}
		userData.access_token = token

		$meDfd   = $.Deferred()
		$picDfd  = $.Deferred()

		FB.api '/me', (res) ->

			userData.full_name = res.name
			userData.social_id = res.id
			userData.email     = res.email or false
			$meDfd.resolve()

		FB.api '/me/picture', { 'width': '200' }, (res) ->

			userData.profile_pic = res.data.url
			$picDfd.resolve()

		$.when($meDfd, $picDfd).done => @$dataDfd.resolve userData

		null

	@share : (opts, cb) =>

		FB.ui {
			method      : opts.method or 'feed'
			name        : opts.name or ''
			link        : opts.link or ''
			picture     : opts.picture or ''
			caption     : opts.caption or ''
			description : opts.description or ''
		}, (response) ->
			cb?(response)

		null

module.exports = Facebook
