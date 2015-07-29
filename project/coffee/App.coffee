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

    LIVE        : null
    BASE_URL    : window.config.hostname
    ASSETS_URL  : window.config.assets_url
    DOODLES_URL : window.config.doodles_url
    localeCode  : window.config.localeCode
    objReady    : 0

    _toClean   : ['objReady', 'setFlags', 'objectComplete', 'init', 'initObjects', 'initSDKs', 'initApp', 'go', 'cleanup', '_toClean']

    constructor : (@LIVE) ->

        return null

    setFlags : =>

        ua = window.navigator.userAgent.toLowerCase()

        MediaQueries.setup();

        @IS_ANDROID    = ua.indexOf('android') > -1
        @IS_FIREFOX    = ua.indexOf('firefox') > -1
        @IS_CHROME_IOS = if ua.match('crios') then true else false # http://stackoverflow.com/a/13808053

        classes = []
        if @IS_ANDROID then classes.push('is-android')
        if @IS_FIREFOX then classes.push('is-firefox')
        if @IS_CHROME_IOS then classes.push('is-chrome-ios')

        $('html').eq(0).addClass(classes.join(' '))

        null

    isMobile : =>

        return @IS_IOS or @IS_ANDROID

    objectComplete : =>

        @objReady++
        @initApp() if @objReady >= 4

        null

    init : =>

        @initObjects()

        null

    initObjects : =>

        @templates = new Templates "#{@ASSETS_URL + window.config.assets.templates}", @objectComplete
        @locale    = new Locale "#{@ASSETS_URL + window.config.assets.locales}", @objectComplete
        @analytics = new Analytics "#{@ASSETS_URL + window.config.assets.tracking}", @objectComplete
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
