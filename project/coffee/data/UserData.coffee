AbstractData    = require './AbstractData'
Requester       = require '../utils/Requester'
API             = require './API'
UserStatusModel = require '../models/core/UserStatusModel'
UserInfoModel   = require '../models/core/UserInfoModel'

class UserData extends AbstractData

	status   : null
	info     : null

	EVENT_USER_LOGGED : 'EVENT_USER_LOGGED'

	constructor : ->

		@status   = new UserStatusModel
		@info     = new UserInfoModel

		super()

		@bindEvents()

		return null

	bindEvents : =>

		@status.on 'change:logged', @onLoggedChange

		null

	onLoggedChange : =>

		if @status.get('logged')

			@trigger @EVENT_USER_LOGGED

		null

	register : (data) =>

		r = Requester.request
			url  : API.get('user.register')
			type : "POST"
			data : data

		r.done @registerSuccess
		r.fail @registerFail

		r

	registerSuccess : (res) =>

		console.log "register successful -->", res

		return res

		null

	registerFail : (res) =>

		console.log "register fail -->", res

		return res

		null

	login : (data) =>

		r = Requester.request
			url  : API.get('user.login')
			type : "POST"
			data : data

		r.done @loginSuccess
		r.fail @loginFail

		r

	loginSuccess : (res) =>

		console.log "login successful -->", res

		return unless res.user

		null

	loginFail : (res) =>

		console.log "failed to log in... -->", res

		null

	logout : (removeUser = false) =>

		endpoint = if removeUser then API.get('user.remove') else API.get('user.logout')

		r = Requester.request
			url  : endpoint
			type : "POST"

		r.done @onLogoutDone

		null

	removeUser : =>

		@logout true

		null

	onLogoutDone : =>

		window.location.href = @__NAMESPACE__().BASE_PATH

		null

module.exports = UserData
