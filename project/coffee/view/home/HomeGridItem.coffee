AbstractView         = require '../AbstractView'
CodeWordTransitioner = require '../../utils/CodeWordTransitioner'

class HomeGridItem extends AbstractView

	template : 'home-grid-item'

	constructor : (@model) ->

		@templateVars = _.extend {}, @model.toJSON()

		super

		return null

	init : =>

		@$authorName = @$el.find('[data-codeword="author_name"]')
		@$doodleName = @$el.find('[data-codeword="name"]')

		null

	setListeners : (setting) =>

		@$el[setting] 'mouseover', @onMouseOver
		@$el[setting] 'mouseout', @onMouseOut

	show : =>

		@$el.addClass 'show-item'

		CodeWordTransitioner.to @model.get('author.name'), @$authorName, 'blue'
		CodeWordTransitioner.to @model.get('name'), @$doodleName, 'blue'

		@setListeners 'on'

		null

	onMouseOver : =>

		CodeWordTransitioner.scramble @$authorName, 'blue'
		CodeWordTransitioner.scramble @$doodleName, 'blue'

		null

	onMouseOut : =>

		CodeWordTransitioner.to @model.get('author.name'), @$authorName, 'blue'
		CodeWordTransitioner.to @model.get('name'), @$doodleName, 'blue'

		null

module.exports = HomeGridItem
