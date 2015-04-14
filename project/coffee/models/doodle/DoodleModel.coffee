AbstractModel        = require '../AbstractModel'
NumberUtils          = require '../../utils/NumberUtils'
CodeWordTransitioner = require '../../utils/CodeWordTransitioner'

class DoodleModel extends AbstractModel

	defaults :
		# from manifest
		"name" : ""
		"author" :
			"name"    : ""
			"github"  : ""
			"website" : ""
			"twitter" : ""
		"description": ""
		"tags" : []
		"interaction" :
			"mouse"    : null
			"keyboard" : null
			"touch"    : null
		"created" : ""
		"slug" : ""
		"index": null
		# site-only
		"indexHTML" : ""
		"source"    : ""
		"url"       : ""
		"scrambled" :
			"name"        : ""
			"author_name" : ""

	_filterAttrs : (attrs) =>

		if attrs.slug
			attrs.url = window.config.hostname + '/' + window.config.routes.DOODLES + '/' + attrs.slug

		if attrs.index
			attrs.index = NumberUtils.zeroFill attrs.index, 3

		if attrs.name and attrs.author.name
			attrs.scrambled =
				name        : CodeWordTransitioner.getScrambledWord attrs.name
				author_name : CodeWordTransitioner.getScrambledWord attrs.author.name

		if attrs.index
			attrs.indexHTML = @getIndexHTML attrs.index

		attrs

	getIndexHTML : (index) =>

		HTML = ""

		for char in index.split('')
			className = if char is '0' then 'index-char-zero' else 'index-char-nonzero'
			HTML += "<span class=\"#{className}\">#{char}</span>"

		HTML

module.exports = DoodleModel
