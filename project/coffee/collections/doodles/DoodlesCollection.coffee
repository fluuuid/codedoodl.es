AbstractCollection = require '../AbstractCollection'
DoodleModel        = require '../../models/doodle/DoodleModel'

class DoodlesCollection extends AbstractCollection

	model : DoodleModel

	getDoodleBySlug : (slug) =>

		doodle = @findWhere slug : slug

		if !doodle
			throw new Error "y u no doodle?"

		return doodle

module.exports = DoodlesCollection
