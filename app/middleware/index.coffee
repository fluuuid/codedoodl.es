notFound = (req, res) ->
	# res.status(404).render("errors/notFound")
	console.log('not found...')

module.exports =
	notFound : notFound
