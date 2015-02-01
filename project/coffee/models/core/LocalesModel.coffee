class LocalesModel extends Backbone.Model

    defaults :
        code     : null
        language : null
        strings  : null
            
    get_language : =>
        return @get('language')

    getString : (id) =>
        ((return e if(a is id)) for a, e of v['strings']) for k, v of @get('strings')
        console.warn "Locales -> not found string: #{id}"
        null

module.exports = LocalesModel
