Analytics    = require './utils/Analytics'
AuthManager  = require './utils/AuthManager'
Share        = require './utils/Share'
Facebook     = require './utils/Facebook'
GooglePlus   = require './utils/GooglePlus'
Templates    = require './data/Templates'
Locale       = require './data/Locale'
Router       = require './router/Router'
Nav          = require './router/Nav'
AppData      = require './AppData'
AppView      = require './AppView'
MediaQueries = require './utils/MediaQueries'

class App

    LIVE       : null
    BASE_PATH  : window.config.hostname
    localeCode : window.config.localeCode
    objReady   : 0

    _toClean   : ['objReady', 'setFlags', 'objectComplete', 'init', 'initObjects', 'initSDKs', 'initApp', 'go', 'cleanup', '_toClean']

    constructor : (@LIVE) ->

        return null

    setFlags : =>

        ua = window.navigator.userAgent.toLowerCase()

        MediaQueries.setup();

        @IS_ANDROID    = ua.indexOf('android') > -1
        @IS_FIREFOX    = ua.indexOf('firefox') > -1
        @IS_CHROME_IOS = if ua.match('crios') then true else false # http://stackoverflow.com/a/13808053

        null

    objectComplete : =>

        @objReady++
        @initApp() if @objReady >= 4

        null

    init : =>

        @initObjects()

        null

    initObjects : =>

        @templates = new Templates "/data/templates#{(if @LIVE then '.min' else '')}.xml", @objectComplete
        @locale    = new Locale "/data/locales/strings.json", @objectComplete
        @analytics = new Analytics "/data/tracking.json", @objectComplete
        @appData   = new AppData @objectComplete

        # if new objects are added don't forget to change the `@objectComplete` function

        null

    initSDKs : =>

        Facebook.load()
        GooglePlus.load()

        null

    initApp : =>

        @setFlags()

        ### Starts application ###
        @appView = new AppView
        @router  = new Router
        @nav     = new Nav
        @auth    = new AuthManager
        @share   = new Share

        @go()

        @initSDKs()

        null

    go : =>

        ### After everything is loaded, kicks off website ###
        @appView.render()

        ### remove redundant initialisation methods / properties ###
        @cleanup()

        null

    cleanup : =>

        for fn in @_toClean
            @[fn] = null
            delete @[fn]

        null

module.exports = App
