AbstractView = require '../view/AbstractView'
Router       = require './Router'

class Nav extends AbstractView

    @EVENT_CHANGE_VIEW     : 'EVENT_CHANGE_VIEW'
    @EVENT_CHANGE_SUB_VIEW : 'EVENT_CHANGE_SUB_VIEW'

    sections :
        HOME    : ''
        EXAMPLE : 'example'

    current  : area : null, sub : null
    previous : area : null, sub : null

    constructor: ->

        @__NAMESPACE__().router.on Router.EVENT_HASH_CHANGED, @changeView

        return false

    getSection : (section) =>

        if section is '' then return true

        for sectionName, uri of @sections
            if uri is section then return sectionName

        false

    changeView: (area, sub, params) =>

        # console.log "area",area
        # console.log "sub",sub
        # console.log "params",params

        @previous = @current
        @current  = area : area, sub : sub

        if @previous.area and @previous.area is @current.area
            @trigger Nav.EVENT_CHANGE_SUB_VIEW, @current
        else
            @trigger Nav.EVENT_CHANGE_VIEW, @previous, @current
            @trigger Nav.EVENT_CHANGE_SUB_VIEW, @current

        if @__NAMESPACE__().appView.modalManager.isOpen() then @__NAMESPACE__().appView.modalManager.hideOpenModal()

        @setPageTitle area, sub

        null

    setPageTitle: (area, sub) =>

        title = "PAGE TITLE HERE - LOCALISE BASED ON URL"

        if window.document.title isnt title then window.document.title = title

        null

module.exports = Nav
