AbstractData = require './data/AbstractData'
Requester    = require './utils/Requester'
API          = require './data/API'

class AppData extends AbstractData

    callback : null

    constructor : (@callback) ->

        ###

        add all data classes here

        ###

        super()

        @getStartData()

        return null

    ###
    get app bootstrap data - embed in HTML or API endpoint
    ###
    getStartData : =>
        
        if API.get('start')

            r = Requester.request
                url  : API.get('start')
                type : 'GET'

            r.done @onStartDataReceived
            r.fail =>

                # console.error "error loading api start data"

                ###
                this is only temporary, while there is no bootstrap data here, normally would handle error / fail
                ###
                @callback?()

        else

            @callback?()

        null

    onStartDataReceived : (data) =>

        ###

        bootstrap data received, app ready to go

        ###

        @callback?()

        null

module.exports = AppData
