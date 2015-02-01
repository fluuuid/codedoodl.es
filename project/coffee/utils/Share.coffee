###
Sharing class for non-SDK loaded social networks.
If SDK is loaded, and provides share methods, then use that class instead, eg. `Facebook.share` instead of `Share.facebook`
###
class Share

    url : null

    constructor : ->

        @url = @__NAMESPACE__().BASE_PATH

        return null

    openWin : (url, w, h) =>

        left = ( screen.availWidth  - w ) >> 1
        top  = ( screen.availHeight - h ) >> 1

        window.open url, '', 'top='+top+',left='+left+',width='+w+',height='+h+',location=no,menubar=no'

        null

    plus : ( url ) =>

        url = encodeURIComponent(url or @url)

        @openWin "https://plus.google.com/share?url=#{url}", 650, 385

        null

    pinterest : (url, media, descr) =>

        url   = encodeURIComponent(url or @url)
        media = encodeURIComponent(media)
        descr = encodeURIComponent(descr)

        @openWin "http://www.pinterest.com/pin/create/button/?url=#{url}&media=#{media}&description=#{descr}", 735, 310

        null

    tumblr : (url, media, descr) =>

        url   = encodeURIComponent(url or @url)
        media = encodeURIComponent(media)
        descr = encodeURIComponent(descr)

        @openWin "http://www.tumblr.com/share/photo?source=#{media}&caption=#{descr}&click_thru=#{url}", 450, 430

        null

    facebook : ( url , copy = '') => 

        url   = encodeURIComponent(url or @url)
        decsr = encodeURIComponent(copy)

        @openWin "http://www.facebook.com/share.php?u=#{url}&t=#{decsr}", 600, 300

        null

    twitter : ( url , copy = '') =>

        url   = encodeURIComponent(url or @url)
        if copy is ''
            copy = @__NAMESPACE__().locale.get 'seo_twitter_card_description'
            
        descr = encodeURIComponent(copy)

        @openWin "http://twitter.com/intent/tweet/?text=#{descr}&url=#{url}", 600, 300

        null

    renren : ( url ) => 

        url = encodeURIComponent(url or @url)

        @openWin "http://share.renren.com/share/buttonshare.do?link=" + url, 600, 300

        null

    weibo : ( url ) => 

        url = encodeURIComponent(url or @url)

        @openWin "http://service.weibo.com/share/share.php?url=#{url}&language=zh_cn", 600, 300

        null

    __NAMESPACE__ : =>

        return window.__NAMESPACE__

module.exports = Share
