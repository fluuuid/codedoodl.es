AbstractCollection = require '../AbstractCollection'
DoodleModel        = require '../../models/doodle/DoodleModel'

class DoodlesCollection extends AbstractCollection

	model : DoodleModel

	getDoodleBySlug : (slug) =>

		doodle = @findWhere slug : slug

		if !doodle
			console.log "y u no doodle?"

		return doodle

	getDoodleByNavSection : (whichSection) =>

		section = @CD().nav[whichSection]

		doodle = @findWhere slug : "#{section.sub}/#{section.ter}"

		doodle

	getPrevDoodle : (doodle) =>

		index = @indexOf doodle
		index--

		if index < 0
			return false
		else
			return @at index

	getNextDoodle : (doodle) =>

		index = @indexOf doodle
		index++

		if index > (@length.length-1)
			return false
		else
			return @at index

module.exports = DoodlesCollection
