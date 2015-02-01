class Router extends Backbone.Router

    @EVENT_HASH_CHANGED : 'EVENT_HASH_CHANGED'

    FIRST_ROUTE : true

    routes :
        '(/)(:area)(/:sub)(/)' : 'hashChanged'
        '*actions'             : 'navigateTo'

    area   : null
    sub    : null
    params : null

    start : =>

        Backbone.history.start 
            pushState : true
            root      : '/'

        null

    hashChanged : (@area = null, @sub = null) =>

        console.log ">> EVENT_HASH_CHANGED @area = #{@area}, @sub = #{@sub} <<"

        if @FIRST_ROUTE then @FIRST_ROUTE = false

        if !@area then @area = @__NAMESPACE__().nav.sections.HOME

        @trigger Router.EVENT_HASH_CHANGED, @area, @sub, @params

        null

    navigateTo : (where = '', trigger = true, replace = false, @params) =>

        if where.charAt(0) isnt "/"
            where = "/#{where}"
        if where.charAt( where.length-1 ) isnt "/"
            where = "#{where}/"

        if !trigger
            @trigger Router.EVENT_HASH_CHANGED, where, null, @params
            return

        @navigate where, trigger: true, replace: replace

        null

    __NAMESPACE__ : =>

        return window.__NAMESPACE__

module.exports = Router
