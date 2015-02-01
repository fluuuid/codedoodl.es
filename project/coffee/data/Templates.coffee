TemplateModel       = require '../models/core/TemplateModel'
TemplatesCollection = require '../collections/core/TemplatesCollection'

class Templates

    templates : null
    cb        : null

    constructor : (templates, callback) ->

        @cb = callback

        $.ajax url : templates, success : @parseXML
           
        null

    parseXML : (data) =>

        temp = []

        $(data).find('template').each (key, value) ->
            $value = $(value)
            temp.push new TemplateModel
                id   : $value.attr('id').toString()
                text : $.trim $value.text()

        @templates = new TemplatesCollection temp

        @cb?()
        
        null        

    get : (id) =>

        t = @templates.where id : id
        t = t[0].get 'text'
        
        return $.trim t

module.exports = Templates
