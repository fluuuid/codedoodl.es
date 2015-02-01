LocalesModel = require '../models/core/LocalesModel'
API          = require '../data/API'

###
# Locale Loader #

Fires back an event when complete

###
class Locale

    lang     : null
    data     : null
    callback : null
    backup   : null
    default  : 'en-gb'

    constructor : (data, cb) ->

        ### start Locale Loader, define locale based on browser language ###

        @callback = cb
        @backup = data

        @lang = @getLang()

        if API.get('locale', { code : @lang })

            $.ajax
                url     : API.get( 'locale', { code : @lang } )
                type    : 'GET'
                success : @onSuccess
                error   : @loadBackup

        else

            @loadBackup()

        null
            
    getLang : =>

        if window.location.search and window.location.search.match('lang=')

            lang = window.location.search.split('lang=')[1].split('&')[0]

        else if window.config.localeCode

            lang = window.config.localeCode

        else

            lang = @default

        lang

    onSuccess : (event) =>

        ### Fires back an event once it's complete ###

        d = null

        if event.responseText
            d = JSON.parse event.responseText
        else 
            d = event

        @data = new LocalesModel d
        @callback?()

        null

    loadBackup : =>

        ### When API not available, tries to load the static .txt locale ###

        $.ajax 
            url      : @backup
            dataType : 'json'
            complete : @onSuccess
            error    : => console.log 'error on loading backup'

        null

    get : (id) =>

        ### get String from locale
        + id : string id of the Localised String
        ###

        return @data.getString id

    getLocaleImage : (url) =>

        return window.config.CDN + "/images/locale/" + window.config.localeCode + "/" + url

module.exports = Locale
