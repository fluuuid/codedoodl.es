AbstractView = require '../view/AbstractView'
Router       = require './Router'

class Nav extends AbstractView

    @EVENT_CHANGE_VIEW     : 'EVENT_CHANGE_VIEW'
    @EVENT_CHANGE_SUB_VIEW : 'EVENT_CHANGE_SUB_VIEW'

    sections : null # set via window.config data, so can be consistent with backend

    current  : area : null, sub : null, ter : null
    previous : area : null, sub : null, ter : null

    constructor: ->

        @sections = window.config.routes

        @CD().router.on Router.EVENT_HASH_CHANGED, @changeView

        return false

    getSection : (section) =>

        if section is '' then return true

        for sectionName, uri of @sections
            if uri is section then return sectionName

        false

    changeView: (area, sub, ter, params) =>

        # console.log "area",area
        # console.log "sub",sub
        # console.log "ter",ter
        # console.log "params",params

        @previous = @current
        @current  = area : area, sub : sub, ter : ter

        if @previous.area and @previous.area is @current.area
            @trigger Nav.EVENT_CHANGE_SUB_VIEW, @current
        else
            @trigger Nav.EVENT_CHANGE_VIEW, @previous, @current
            @trigger Nav.EVENT_CHANGE_SUB_VIEW, @current

        if @CD().appView.modalManager.isOpen() then @CD().appView.modalManager.hideOpenModal()

        @setPageTitle area, sub, ter

        null

    setPageTitle: (area, sub, ter) =>

        title = "PAGE TITLE HERE - LOCALISE BASED ON URL"

        if window.document.title isnt title then window.document.title = title

        null

module.exports = Nav
