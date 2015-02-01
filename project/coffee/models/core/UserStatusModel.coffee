AbstractModel = require '../AbstractModel'

class UserStatusModel extends AbstractModel

	defaults :
		logged : false

module.exports = UserStatusModel
