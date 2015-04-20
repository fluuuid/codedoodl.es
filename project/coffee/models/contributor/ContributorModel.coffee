AbstractModel        = require '../AbstractModel'
NumberUtils          = require '../../utils/NumberUtils'
CodeWordTransitioner = require '../../utils/CodeWordTransitioner'

class ContributorModel extends AbstractModel

    defaults : 
        "name"    : ""
        "github"  : ""
        "website" : ""
        "twitter" : ""
        "html"    : ""

    _filterAttrs : (attrs) =>

        if attrs.name
            attrs.html = @getHtml attrs

        attrs

    getHtml : (attrs) =>

        html  = ""
        links = []

        if attrs.website
            html += "<a href=\"#{attrs.website}\" target=\"_blank\">#{attrs.name}</a> "
        else
            html += "#{attrs.name} "

        if attrs.twitter then links.push "<a href=\"http://twitter.com/#{attrs.twitter}\">tw</a>"
        if attrs.github then links.push "<a href=\"http://github.com/#{attrs.github}\">gh</a>"

        html += "(#{links.join(', ')})"

        html

module.exports = ContributorModel
