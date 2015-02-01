AbstractData = require '../data/AbstractData'
Facebook     = require '../utils/Facebook'
GooglePlus   = require '../utils/GooglePlus'

class AuthManager extends AbstractData

	userData  : null

	# @process true during login process
	process      : false
	processTimer : null
	processWait  : 5000

	constructor : ->

		@userData  = @__NAMESPACE__().appData.USER

		super()

		return null

	login : (service, cb=null) =>

		# console.log "++++ PROCESS ",@process

		return if @process

		@showLoader()
		@process = true

		$dataDfd = $.Deferred()

		switch service
			when 'google'
				GooglePlus.login $dataDfd
			when 'facebook'
				Facebook.login $dataDfd

		$dataDfd.done (res) => @authSuccess service, res
		$dataDfd.fail (res) => @authFail service, res
		$dataDfd.always () => @authCallback cb

		###
		Unfortunately no callback is fired if user manually closes G+ login modal,
		so this is to allow them to close window and then subsequently try to log in again...
		###
		@processTimer = setTimeout @authCallback, @processWait

		$dataDfd

	authSuccess : (service, data) =>

		# console.log "login callback for #{service}, data => ", data

		null

	authFail : (service, data) =>

		# console.log "login fail for #{service} => ", data

		null

	authCallback : (cb=null) =>

		return unless @process

		clearTimeout @processTimer

		@hideLoader()
		@process = false

		cb?()

		null

	###
	show / hide some UI indicator that we are waiting for social network to respond
	###
	showLoader : =>

		# console.log "showLoader"

		null

	hideLoader : =>

		# console.log "hideLoader"

		null

module.exports = AuthManager
