AbstractView     = require './view/AbstractView'
Preloader        = require './view/base/Preloader'
Header           = require './view/base/Header'
Wrapper          = require './view/base/Wrapper'
Footer           = require './view/base/Footer'
PageTransitioner = require './view/base/PageTransitioner'
ModalManager     = require './view/modals/_ModalManager'

class AppView extends AbstractView

    template : 'main'

    $window  : null
    $body    : null

    wrapper  : null
    footer   : null

    dims :
        w : null
        h : null
        o : null
        updateMobile : true
        lastHeight   : null

    lastScrollY : 0
    ticking     : false

    EVENT_UPDATE_DIMENSIONS : 'EVENT_UPDATE_DIMENSIONS'
    EVENT_PRELOADER_HIDE    : 'EVENT_PRELOADER_HIDE'
    EVENT_ON_SCROLL         : 'EVENT_ON_SCROLL'

    MOBILE_WIDTH : 700
    MOBILE       : 'mobile'
    NON_MOBILE   : 'non_mobile'

    constructor : ->

        @$window = $(window)
        @$body   = $('body').eq(0)

        super()

    disableTouch: =>

        @$window.on 'touchmove', @onTouchMove

        null

    enableTouch: =>

        @$window.off 'touchmove', @onTouchMove

        null

    onTouchMove: ( e ) ->

        e.preventDefault()

        null

    render : =>

        @bindEvents()

        @preloader    = new Preloader
        @modalManager = new ModalManager

        @header       = new Header
        @wrapper      = new Wrapper
        @footer       = new Footer
        @transitioner = new PageTransitioner

        @
            .addChild @header
            .addChild @wrapper
            .addChild @footer
            .addChild @transitioner

        @onAllRendered()

        null

    bindEvents : =>

        @on 'allRendered', @onAllRendered

        @onResize()

        @onResize = _.debounce @onResize, 300
        @$window.on 'resize orientationchange', @onResize
        @$window.on "scroll", @onScroll

        @$body.on 'click', 'a', @linkManager

        null

    onScroll : =>

        @lastScrollY = window.scrollY
        @requestTick()

        null

    requestTick : =>

        if !@ticking
            requestAnimationFrame @scrollUpdate
            @ticking = true

        null

    scrollUpdate : =>

        @ticking = false

        @$body.addClass('disable-hover')

        clearTimeout @timerScroll

        @timerScroll = setTimeout =>
            @$body.removeClass('disable-hover')
        , 50

        @trigger @EVENT_ON_SCROLL

        null

    onAllRendered : =>

        # console.log "onAllRendered : =>"

        @$body.prepend @$el

        @preloader.playIntroAnimation => @trigger @EVENT_PRELOADER_HIDE

        @begin()

        null

    begin : =>

        @trigger 'start'

        @CD().router.start()

        null

    onResize : =>

        @getDims()

        null

    getDims : =>

        w = window.innerWidth or document.documentElement.clientWidth or document.body.clientWidth
        h = window.innerHeight or document.documentElement.clientHeight or document.body.clientHeight

        change = h / @dims.lastHeight

        @dims =
            w : w
            h : h
            o : if h > w then 'portrait' else 'landscape'
            updateMobile : !@CD().isMobile() or change < 0.8 or change > 1.2
            lastHeight   : h

        @trigger @EVENT_UPDATE_DIMENSIONS, @dims

        null

    linkManager : (e) =>

        href = $(e.currentTarget).attr('href')

        return false unless href

        @navigateToUrl href, e

        null

    navigateToUrl : ( href, e = null ) =>

        route   = if href.match(@CD().BASE_URL) then href.split(@CD().BASE_URL)[1] else href
        section = if route.charAt(0) is '/' then route.split('/')[1].split('/')[0] else route.split('/')[0]

        if @CD().nav.getSection section
            e?.preventDefault()
            @CD().router.navigateTo route
        else 
            @handleExternalLink href

        null

    handleExternalLink : (data) =>

        console.log "handleExternalLink : (data) => "

        ###

        bind tracking events if necessary

        ###

        null

module.exports = AppView
