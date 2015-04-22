AbstractView = require '../AbstractView'
HomeView     = require '../home/HomeView'
Colors       = require '../../config/Colors'

class PageTransitioner extends AbstractView

    template : 'page-transitioner'

    pageLabels : null

    palettes :
        HOME       : [ Colors.CD_BLUE, Colors.OFF_WHITE, Colors.CD_RED ]
        ABOUT      : [ Colors.CD_RED, Colors.OFF_WHITE, Colors.CD_BLUE ]
        CONTRIBUTE : [ Colors.CD_BLUE, Colors.OFF_WHITE, Colors.CD_RED ]
        DOODLES    : [ Colors.CD_RED, Colors.OFF_WHITE, Colors.CD_BLUE ]

    activeConfig : null

    configPresets :
        bottomToTop :
            finalTransform : 'translate3d(0, -100%, 0)'
            start :
                visibility: 'visible', transform : 'translate3d(0, 100%, 0)'
            end :
                visibility: 'visible', transform : 'none'
        topToBottom :
            finalTransform : 'translate3d(0, 100%, 0)'
            start :
                visibility: 'visible', transform : 'translate3d(0, -100%, 0)'
            end :
                visibility: 'visible', transform : 'none'
        leftToRight :
            finalTransform : 'translate3d(100%, 0, 0)'
            start :
                visibility: 'visible', transform : 'translate3d(-100%, 0, 0)'
            end :
                visibility: 'visible', transform : 'none'
        rightToLeft :
            finalTransform : 'translate3d(-100%, 0, 0)'
            start :
                visibility: 'visible', transform : 'translate3d(100%, 0, 0)'
            end :
                visibility: 'visible', transform : 'none'

    TRANSITION_TIME : 0.5

    constructor: ->

        @templateVars = 
            pageLabels :
                HOME       : @CD().locale.get "page_transitioner_label_HOME"
                ABOUT      : @CD().locale.get "page_transitioner_label_ABOUT"
                CONTRIBUTE : @CD().locale.get "page_transitioner_label_CONTRIBUTE"
            pageLabelPrefix : @CD().locale.get "page_transitioner_label_prefix"

        super()

        return null

    init : =>

        @$panes     = @$el.find('[data-pane]')
        @$labelPane = @$el.find('[data-label-pane]')
        @$label     = @$el.find('[data-label]')

        null

    prepare : (fromArea, toArea) =>

        @resetPanes()

        @applyPalette @getPalette toArea

        @activeConfig = @getConfig(fromArea, toArea)

        @applyConfig @activeConfig.start
        @applyLabelConfig @activeConfig.finalTransform

        @applyLabel @getAreaLabel toArea

        null

    resetPanes : =>

        @$panes.attr 'style': ''

        null

    getAreaLabel : (area, direction='to') =>

        section = @CD().nav.getSection area, true

        if section is 'DOODLES'
            label = @getDoodleLabel direction
        else
            label = @templateVars.pageLabels[section]

        label

    getDoodleLabel : (direction) =>

        section = if direction is 'to' then 'current' else 'previous'
        doodle = @CD().appData.doodles.getDoodleByNavSection section

        if doodle
            label = doodle.get('author.name') + ' \\ ' + doodle.get('name')
        else
            label = 'doodle'

        label

    applyLabel : (toLabel) =>

        @$label.html @templateVars.pageLabelPrefix + ' ' + toLabel + '...'

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
            config = @_getDoodleToDoodleConfig()

        else if toArea is @CD().nav.sections.ABOUT or toArea is @CD().nav.sections.CONTRIBUTE
            # config = @configPresets.topToBottom
            config = @_getRandomConfig()

        # else if fromArea is @CD().nav.sections.HOME or toArea is @CD().nav.sections.HOME
        else
            # config = @configPresets.bottomToTop
            config = @_getRandomConfig()

        config

    _getDoodleToDoodleConfig : (prevSlug, nextSlug) =>

        previousDoodle = @CD().appData.doodles.getDoodleByNavSection 'previous'
        previousDoodleIdx = @CD().appData.doodles.indexOf previousDoodle

        currentDoodle = @CD().appData.doodles.getDoodleByNavSection 'current'
        currentDoodleIdx = @CD().appData.doodles.indexOf currentDoodle

        _config = if previousDoodleIdx > currentDoodleIdx then @configPresets.leftToRight else @configPresets.rightToLeft

        _config

    _getRandomConfig : =>

        _config = _.shuffle(@configPresets)[0]

        _config

    applyConfig : (config) =>

        @$panes.css config

        null

    applyLabelConfig : (transformValue) =>

        @$labelPane.css 'transform' : transformValue

        null

    show : =>

        @$el.addClass 'show'

        null

    hide : =>

        @$el.removeClass 'show'

        null

    in : (cb) =>

        @show()

        commonParams = transform : 'none', ease : Expo.easeOut, force3D: true

        @$panes.each (i, el) =>
            params = _.extend {}, commonParams,
                delay : i * 0.05
            if i is 2 then params.onComplete = =>
                @applyConfig @activeConfig.end
                cb?()

            TweenLite.to $(el), @TRANSITION_TIME, params

        labelParams = _.extend {}, commonParams, delay : 0.1
        TweenLite.to @$labelPane, @TRANSITION_TIME, labelParams

        null

    out : (cb) =>

        commonParams = ease : Expo.easeOut, force3D: true, clearProps: 'all'

        @$panes.each (i, el) =>
            params = _.extend {}, commonParams,            
                delay     : 0.1 - (0.05 * i)
                transform : @activeConfig.finalTransform
            if i is 0 then params.onComplete = =>
                @hide()
                cb?()

            TweenLite.to $(el), @TRANSITION_TIME, params

        labelParams = _.extend {}, commonParams, transform : @activeConfig.start.transform
        TweenLite.to @$labelPane, @TRANSITION_TIME, labelParams

        null

module.exports = PageTransitioner
