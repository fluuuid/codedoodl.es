AbstractView = require '../view/AbstractView'
Router       = require './Router'

class Nav extends AbstractView

    @EVENT_CHANGE_VIEW     : 'EVENT_CHANGE_VIEW'
    @EVENT_CHANGE_SUB_VIEW : 'EVENT_CHANGE_SUB_VIEW'

    sections : null # set via window.config data, so can be consistent with backend

    current  : area : null, sub : null, ter : null
    previous : area : null, sub : null, ter : null

    changeViewCount : 0

    constructor: ->

        @sections = window.config.routes
        @favicon = document.getElementById('favicon')

        @CD().router.on Router.EVENT_HASH_CHANGED, @changeView

        return false

    getSection : (section, strict=false) =>

        if !strict and section is '' then return true

        for sectionName, uri of @sections
            if uri is section then return sectionName

        false

    changeView: (area, sub, ter, params) =>

        # console.log "area",area
        # console.log "sub",sub
        # console.log "ter",ter
        # console.log "params",params

        @changeViewCount++

        @previous = @current
        @current  = area : area, sub : sub, ter : ter

        @trigger Nav.EVENT_CHANGE_VIEW, @previous, @current
        @trigger Nav.EVENT_CHANGE_SUB_VIEW, @current

        if @CD().appView.modalManager.isOpen() then @CD().appView.modalManager.hideOpenModal()

        @setPageTitle area, sub, ter
        @setPageFavicon()

        null

    setPageTitle: (area, sub, ter) =>

        section   = if area is '' then 'HOME' else @CD().nav.getSection area
        titleTmpl = @CD().locale.get("page_title_#{section}") or @CD().locale.get("page_title_HOME")
        title = @supplantString titleTmpl, @getPageTitleVars(area, sub, ter), false

        if window.document.title isnt title then window.document.title = title

        null

    setPageFavicon: =>

        colour = _.shuffle(['red', 'blue', 'black'])[0]

        setTimeout =>
            @favicon.href = "#{@CD().BASE_URL}/static/img/icons/favicon/favicon_#{colour}.png"
        , 0

        null

    getPageTitleVars: (area, sub, ter) =>

        vars = {}

        if area is @sections.DOODLES and sub and ter
            doodle = @CD().appData.doodles.findWhere slug: "#{sub}/#{ter}"

            if !doodle
                vars.name = "doodle"
            else
                vars.name = doodle.get('author.name') + ' \\ ' + doodle.get('name') + ' '

        vars

module.exports = Nav
