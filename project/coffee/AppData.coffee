AbstractData      = require './data/AbstractData'
Requester         = require './utils/Requester'
API               = require './data/API'
DoodlesCollection = require './collections/doodles/DoodlesCollection'

class AppData extends AbstractData

    callback : null

    constructor : (@callback) ->

        ###

        add all data classes here

        ###

        super()

        @doodles = new DoodlesCollection

        @getStartData()

        return null

    ###
    get app bootstrap data - embed in HTML or API endpoint
    ###
    getStartData : =>
        
        # if API.get('start')
        if true

            r = Requester.request
                # url  : API.get('start')
                url  : @CD().BASE_URL + '/data/_DUMMY/doodles.json'
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

        console.log "onStartDataReceived : (data) =>", data

        # toAdd = []
        # (toAdd = toAdd.concat data.doodles) for i in [0...5]

        @doodles.add data.doodles

        ###

        bootstrap data received, app ready to go

        ###

        @callback?()

        null

module.exports = AppData
