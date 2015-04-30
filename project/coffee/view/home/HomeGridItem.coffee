AbstractView         = require '../AbstractView'
CodeWordTransitioner = require '../../utils/CodeWordTransitioner'

class HomeGridItem extends AbstractView

	template : 'home-grid-item'

	maxOffset : null

	ITEM_MIN_OFFSET : 50
	ITEM_MAX_OFFSET : 700

	constructor : (@model) ->

		@templateVars = _.extend {}, @model.toJSON()

		@maxOffset = (_.random @ITEM_MIN_OFFSET, @ITEM_MAX_OFFSET) / 10

		super

		return null

	init : =>

		@$authorName = @$el.find('[data-codeword="author_name"]')
		@$doodleName = @$el.find('[data-codeword="name"]')

		null

	setListeners : (setting) =>

		@$el[setting] 'mouseover', @onMouseOver

		null

	show : =>

		@$el.addClass 'show-item'

		CodeWordTransitioner.to @model.get('author.name'), @$authorName, 'blue'
		CodeWordTransitioner.to @model.get('name'), @$doodleName, 'blue'

		@setListeners 'on'

		null

	onMouseOver : =>

		CodeWordTransitioner.to @model.get('author.name'), @$authorName, 'blue'
		CodeWordTransitioner.to @model.get('name'), @$doodleName, 'blue'

		null

module.exports = HomeGridItem
