###
Analytics wrapper
###
class Analytics

    tags    : null
    started : false

    attempts        : 0
    allowedAttempts : 5

    constructor : (tags, @callback) ->

        $.getJSON tags, @onTagsReceived

        return null

    onTagsReceived : (data) =>

        @tags    = data
        @started = true
        @callback?()

        null

    ###
    @param string id of the tracking tag to be pushed on Analytics 
    ###
    track : (param) =>

        return if !@started

        if param

            v = @tags[param]

            if v

                args = ['send', 'event']
                ( args.push(arg) ) for arg in v

                # loading GA after main app JS, so external script may not be here yet
                if window.ga
                    ga.apply null, args
                else if @attempts >= @allowedAttempts
                    @started = false
                else
                    setTimeout =>
                        @track param
                        @attempts++
                    , 2000

        null

module.exports = Analytics
