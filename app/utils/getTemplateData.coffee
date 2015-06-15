_      = require 'underscore'
config = require '../../config/server'
locale = require '../../project/data/locales/strings.json'

_getRoutePageTitle = (route) ->

    locale.strings.PAGE_TITLES.strings["page_title_#{route}"]

_getDefaultMetaData = (route) ->

    title = _getRoutePageTitle(route)
    url   = "#{config.BASE_URL}/#{config.routes[route]}"
    image = "#{config.ASSETS_BUCKET_URL}/static/img/share_thumbnail.jpg"

    return {
        "meta_description"         : locale.strings.SEO.strings["seo_meta_description"]
        "meta_keywords"            : locale.strings.SEO.strings["seo_meta_keywords"]
        "og_title"                 : title
        "og_url"                   : url
        "og_image"                 : image
        "og_description"           : locale.strings.SEO.strings["seo_og_description"]
        "og_site_name"             : locale.strings.SEO.strings["seo_og_site_name"]
        "twitter_card_card"        : locale.strings.SEO.strings["seo_twitter_card_card"]
        "twitter_card_site"        : locale.strings.SEO.strings["seo_twitter_card_site"]
        "twitter_card_url"         : url
        "twitter_card_title"       : title
        "twitter_card_description" : locale.strings.SEO.strings["seo_twitter_card_description"]
        "twitter_card_image"       : image
    }

_getDoodlePageTitle = (doodle) ->

    tmpl = locale.strings.PAGE_TITLES.strings["page_title_DOODLES"]
    tmpl.replace '{{ name }}', "#{doodle.author.name} \\ #{doodle.name}"

_getDoodleMetaData = (doodle) ->

    doodle_title     = _getDoodlePageTitle(doodle)
    doodle_url       = "#{config.BASE_URL}/#{config.routes.DOODLES}/#{doodle.slug}"
    doodle_thumbnail = "#{config.DOODLES_BUCKET_URL}/#{doodle.slug}/thumb.jpg"

    fb_tw_desc_tmpl  = locale.strings.SEO.strings["seo_og_twitter_doodle_description"]
    fb_description   = fb_tw_desc_tmpl.replace("{{ doodle_name }}", "#{doodle.name} ").replace('{{ doodle_author }}', " #{doodle.author.name} ")
    tw_description   = fb_tw_desc_tmpl.replace("{{ doodle_name }}", "#{doodle.name} ").replace('{{ doodle_author }}', if doodle.author.twitter then " @#{doodle.author.twitter} " else " #{doodle.author.name} ")

    return {
        "meta_description"         : doodle.description
        "meta_keywords"            : doodle.tags.join(', ')
        "og_title"                 : doodle_title
        "og_url"                   : doodle_url
        "og_image"                 : doodle_thumbnail
        "og_description"           : fb_description
        "og_site_name"             : locale.strings.SEO.strings["seo_og_site_name"]
        "twitter_card_card"        : locale.strings.SEO.strings["seo_twitter_card_card"]
        "twitter_card_site"        : locale.strings.SEO.strings["seo_twitter_card_site"]
        "twitter_card_url"         : doodle_url
        "twitter_card_title"       : doodle_title
        "twitter_card_description" : tw_description
        "twitter_card_image"       : doodle_thumbnail
    }

getTemplateData = (route, req) ->

    if route is 'DOODLES'
        allDoodles = require('./getDoodleData').getDoodles()
        doodle     = _.findWhere allDoodles, { slug : "#{req.params.authorName}/#{req.params.doodleName}" }
        page_title = _getDoodlePageTitle doodle
        meta_data  = _getDoodleMetaData doodle
    else
        page_title = _getRoutePageTitle route
        meta_data = _getDefaultMetaData route

    return _.extend {},
        config     : config
        page_title : page_title
        meta_data  : meta_data

module.exports = getTemplateData
