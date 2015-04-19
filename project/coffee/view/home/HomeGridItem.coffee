AbstractView         = require '../AbstractView'
CodeWordTransitioner = require '../../utils/CodeWordTransitioner'

class HomeGridItem extends AbstractView

	template : 'home-grid-item'

	constructor : (@model, @fullPageTransition) ->

		@templateVars = _.extend {}, @model.toJSON()

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
