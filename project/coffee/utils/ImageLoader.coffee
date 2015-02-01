class ImageLoader

	@load: ( src ) ->

		dfd = $.Deferred()
		img = new Image()
		img.onload = =>
			dfd.resolve img
		img.src = src

		dfd

	@loadSet: ( set ) ->

		loaders = []
		for i in set
			loaders.push ImageLoader.load(i).promise()

		$.when.apply(null, loaders)

module.exports = ImageLoader
