AbstractModel        = require '../AbstractModel'
NumberUtils          = require '../../utils/NumberUtils'
CodeWordTransitioner = require '../../utils/CodeWordTransitioner'
Hashids              = require 'hashids'

class DoodleModel extends AbstractModel

    defaults :
        # from manifest
        "name" : ""
        "author" :
            "name"    : ""
            "github"  : ""
            "website" : ""
            "twitter" : ""
        "instructions": ""
        "description": ""
        "tags" : []
        "interaction" :
            "mouse"    : null
            "keyboard" : null
            "touch"    : null
        "created" : ""
        "slug" : ""
        "shortlink" : ""
        "colour_scheme" : ""
        "index": null
        "index_padded" : ""
        # site-only
        "indexHTML" : ""
        "source"    : ""
        "url"       : ""
        "scrambled" :
            "name"        : ""
            "author_name" : ""
        "viewed" : false

        "SAMPLE_DIR" : ""

    SAMPLE_DOODLES : [
        'square-stream',
        'shape-stream-light',
        'box-physics',
        'stars',
        'tubes'
    ]

    constructor : ->

        super

        ###
        GET_DUMMY_DOODLE_SCHTUFF
        ###
        attrs = {}
        sample = _.shuffle(@SAMPLE_DOODLES)[0]
        attrs.SAMPLE_DIR = sample
        attrs.colour_scheme = if sample is 'shape-stream-light' then 'light' else 'dark'
        @set attrs

        return null

    _filterAttrs : (attrs) =>

        if attrs.slug
            attrs.url = window.config.hostname + '/' + window.config.routes.DOODLES + '/' + attrs.slug

        if attrs.index
            attrs.index_padded = NumberUtils.zeroFill attrs.index, 3
            attrs.indexHTML    = @getIndexHTML attrs.index_padded

        if attrs.name and attrs.author.name
            attrs.scrambled =
                name        : CodeWordTransitioner.getScrambledWord attrs.name
                author_name : CodeWordTransitioner.getScrambledWord attrs.author.name

        attrs

    getIndexHTML : (index) =>

        html = ""

        for char in index.split('')
            className = if char is '0' then 'index-char-zero' else 'index-char-nonzero'
            html += "<span class=\"#{className}\">#{char}</span>"

        html

    getAuthorHtml : =>

        portfolio_label = @CD().locale.get "misc_portfolio_label"

        attrs = @get('author')
        html  = ""
        links = []

        html += "#{attrs.name} \\ "

        if attrs.website then links.push "<a href=\"#{attrs.website}\" target=\"_blank\">#{portfolio_label}</a> "
        if attrs.twitter then links.push "<a href=\"http://twitter.com/#{attrs.twitter}\" target=\"_blank\">tw</a>"
        if attrs.github then links.push "<a href=\"http://github.com/#{attrs.github}\" target=\"_blank\">gh</a>"

        html += "#{links.join(' \\ ')}"

        html

    # no need to do this for every doodle - only do it if we view the info pane for a particular doodle
    setShortlink : =>

        return if @get 'shortlink'

        h = new Hashids window.config.shortlinks.SALT, 0, window.config.shortlinks.ALPHABET
        shortlink = h.encode @get 'index'
        @set 'shortlink', shortlink

        null

module.exports = DoodleModel
