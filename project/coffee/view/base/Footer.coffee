AbstractView = require '../AbstractView'

class Footer extends AbstractView

    template : 'site-footer'

    constructor: ->

        @templateVars = {}

        super()

        return null

module.exports = Footer
