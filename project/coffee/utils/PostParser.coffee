class PostParser

    @getRichText: ( post ) ->

        type = PostParser._getPostType post
        richText = switch true

            when type is 'twitter' then PostParser._getRichText_TW post.text
            when type is 'instagram' then PostParser._getRichText_IG post.text

    @_getRichText_TW: (text) ->

        exp = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig
        text = text.replace(exp, "<a href='$1' target='_blank'>$1</a>")

        exp = /#(\w+)/g
        text = text.replace(exp, "<a href='http://twitter.com/search?q=%23$1' target='_blank'>#$1</a>")

        exp = /@(\w+)/g
        text = text.replace(exp, "<a href='http://www.twitter.com/$1' target='_blank'>@$1</a>")

        return text

    @_getRichText_IG: (text) ->

        exp = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig
        text = text.replace(exp, "<a href='$1' target='_blank'>$1</a>")

        exp = /@(\w+)/g
        text = text.replace(exp, "<a href='http://www.instagram.com/$1' target='_blank'>@$1</a>")

        return text

    @getUsernameLink: ( post ) ->

        type = PostParser._getPostType post

        nameLink = switch true

            when type is 'twitter' then PostParser._getUsernameLink_TW post
            when type is 'instagram' then PostParser._getUsernameLink_IG post

    @_getUsernameLink_TW: (postData) ->

        return "<a href=\"http://twitter.com/#{postData.user.screen_name}\" target=\"_blank\">@#{postData.user.screen_name}</a>"

    @_getUsernameLink_IG: (postData) ->

        return "<a href=\"http://instagram.com/#{postData.user.screen_name}\" target=\"_blank\">@#{postData.user.screen_name}</a>"

    @_getPostType: ( post ) =>
        if /instagram/.test post.source then 'instagram' else 'twitter'

module.exports = PostParser
