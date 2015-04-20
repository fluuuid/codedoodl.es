AbstractView = require '../AbstractView'
HomeView     = require '../home/HomeView'
Colors       = require '../../config/Colors'

class PageTransitioner extends AbstractView

    template : 'page-transitioner'

    palettes :
        HOME       : [ Colors.CD_BLUE, Colors.OFF_WHITE, Colors.CD_RED ]
        ABOUT      : [ Colors.CD_RED, Colors.OFF_WHITE, Colors.CD_BLUE ]
        CONTRIBUTE : [ Colors.CD_BLUE, Colors.OFF_WHITE, Colors.CD_RED ]
        DOODLES    : [ Colors.CD_RED, Colors.OFF_WHITE, Colors.CD_BLUE ]

    activeConfig :
        prop : null
        start :
            top : null, bottom : null, left : null, right : null, width : null, height : null
        end :
            top : null, bottom : null, left : null, right : null, width : null, height : null

    configPresets :
        bottomToTop :
            prop : 'height'
            start :
                top : 'auto', bottom : 0, left : 0, right : 0, width : '100%', height : 0
            end :
                top : 0, bottom : 'auto', left : 0, right : 0, width : '100%', height : '100%'
        topToBottom :
            prop : 'height'
            start :
                top : 0, bottom : 'auto', left : 0, right : 0, width : '100%', height : 0
            end :
                top : 'auto', bottom : 0, left : 0, right : 0, width : '100%', height : '100%'
        leftToRight :
            prop : 'width'
            start :
                top : 0, bottom : 0, left : 0, right : 'auto', width : 0, height : '100%'
            end :
                top : 0, bottom : 0, left : 'auto', right : 0, width : '100%', height : '100%'
        rightToLeft :
            prop : 'width'
            start :
                top : 0, bottom : 0, left : 'auto', right : 0, width : 0, height : '100%'
            end :
                top : 0, bottom : 0, left : 0, right : 'auto', width : '100%', height : '100%'

    constructor: ->

        @templateVars = {}

        super()

        return null

    init : =>

        @$panes = @$el.find('[data-pane]')

        null

    prepare : (fromArea, toArea) =>

        @resetPanes()

        @applyPalette @getPalette toArea

        @activeConfig = @getConfig(fromArea, toArea)

        @applyConfig @activeConfig.start

        null

    resetPanes : =>

        @$panes.attr 'style': ''

        null

    getPalette : (area) =>

        section = @CD().nav.getSection area, true

        @palettes[section] or @palettes.HOME

    applyPalette : (palette) =>

        @$panes.each (i) => @$panes.eq(i).css 'background-color' : palette[i]

        null

    getConfig : (fromArea, toArea) =>

        if !HomeView.visitedThisSession and toArea is @CD().nav.sections.HOME
            config = @configPresets.bottomToTop

        else if fromArea is @CD().nav.sections.DOODLES and toArea is @CD().nav.sections.DOODLES
            config = @_getDoodleToDoodleConfig "#{@CD().nav.previous.sub}/#{@CD().nav.previous.ter}", "#{@CD().nav.current.sub}/#{@CD().nav.current.ter}"

        else if toArea is @CD().nav.sections.ABOUT or toArea is @CD().nav.sections.CONTRIBUTE
            # config = @configPresets.topToBottom
            config = @_getRandomConfig()

        # else if fromArea is @CD().nav.sections.HOME or toArea is @CD().nav.sections.HOME
        else
            # config = @configPresets.bottomToTop
            config = @_getRandomConfig()

        config

    _getDoodleToDoodleConfig : (prevSlug, nextSlug) =>

        previousDoodle = @CD().appData.doodles.findWhere slug : prevSlug
        previousDoodleIdx = @CD().appData.doodles.indexOf previousDoodle

        currentDoodle = @CD().appData.doodles.findWhere slug : nextSlug
        currentDoodleIdx = @CD().appData.doodles.indexOf currentDoodle

        _config = if previousDoodleIdx > currentDoodleIdx then @configPresets.leftToRight else @configPresets.rightToLeft

        _config

    _getRandomConfig : =>

        _config = _.shuffle(@configPresets)[0]

        _config

    applyConfig : (config) =>

        @$panes.css config

        null

    show : =>

        @$el.addClass 'show'

        null

    hide : =>

        @$el.removeClass 'show'

        null

    in : (cb) =>

        @show()

        @$panes.each (i, el) =>
            params = ease : Expo.easeOut
            params.delay = i * 0.1
            params[@activeConfig.prop] = '100%'
            if i is 2 then params.onComplete = =>
                @applyConfig @activeConfig.end
                cb?()

            TweenLite.to $(el), 0.5, params

        null

    out : (cb) =>

        @$panes.each (i, el) =>
            params = ease : Expo.easeOut
            params.delay = 0.2 - (0.1 * i)
            params[@activeConfig.prop] = '0'
            if i is 0 then params.onComplete = =>
                @hide()
                cb?()

            TweenLite.to $(el), 0.5, params

        null

module.exports = PageTransitioner
