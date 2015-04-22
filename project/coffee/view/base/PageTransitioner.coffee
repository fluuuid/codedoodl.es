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

    activeConfig :
        prop : null
        start :
            top : null, bottom : null, left : null, right : null, width : null, height : null
        end :
            top : null, bottom : null, left : null, right : null, width : null, height : null

    configPresets :
        bottomToTop :
            prop : 'scaleY(0)'
            start :
                visibility: 'visible', transformOrigin : '50% 100%', transform : 'scaleY(0)'
            end :
                visibility: 'visible', transformOrigin : '50% 0%', transform : 'none'
        topToBottom :
            prop : 'scaleY(0)'
            start :
                visibility: 'visible', transformOrigin : '50% 0%', transform : 'scaleY(0)'
            end :
                visibility: 'visible', transformOrigin : '50% 100%', transform : 'none'
        leftToRight :
            prop : 'scaleX(0)'
            start :
                visibility: 'visible', transformOrigin : '0% 50%', transform : 'scaleX(0)'
            end :
                visibility: 'visible', transformOrigin : '100% 50%', transform : 'none'
        rightToLeft :
            prop : 'scaleX(0)'
            start :
                visibility: 'visible', transformOrigin : '100% 50%', transform : 'scaleX(0)'
            end :
                visibility: 'visible', transformOrigin : '0% 50%', transform : 'none'

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

        @$panes = @$el.find('[data-pane]')
        @$label = @$el.find('[data-label]')

        null

    prepare : (fromArea, toArea) =>

        @resetPanes()

        @applyPalette @getPalette toArea

        @activeConfig = @getConfig(fromArea, toArea)

        @applyConfig @activeConfig.start

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

    show : =>

        @$el.addClass 'show'

        null

    hide : =>

        @$el.removeClass 'show'

        null

    in : (cb) =>

        @show()

        @$panes.each (i, el) =>
            params = ease : Expo.easeOut, force3D: true
            params.delay = i * 0.05
            params.transform = 'none'
            if i is 2 then params.onComplete = =>
                @applyConfig @activeConfig.end
                cb?()

            TweenLite.to $(el), 0.5, params

        null

    out : (cb) =>

        @$panes.each (i, el) =>
            params = ease : Expo.easeOut, force3D: true, clearProps: 'all'
            params.delay = 0.1 - (0.05 * i)
            params.transform = @activeConfig.prop
            if i is 0 then params.onComplete = =>
                @hide()
                cb?()

            TweenLite.to $(el), 0.5, params

        null

module.exports = PageTransitioner
