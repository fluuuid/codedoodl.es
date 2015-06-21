#   ---------------------
#   Media Queries Manager 
#   ---------------------
#   
#   @author : Fábio Azevedo <fabio.azevedo@unit9.com> UNIT9
#   @date   : September 14
#   
#   Instructions are on /project/sass/utils/_responsive.scss.

class MediaQueries

    # Breakpoints
    @SMALL       : "small"
    @IPAD        : "ipad"
    @MEDIUM      : "medium"
    @LARGE       : "large"
    @EXTRA_LARGE : "extra-large"

    @JS_EL        : null
    @EL_CLASSNAME : 'js-mediaqueries'

    @setup : =>

        MediaQueries.JS_EL = document.createElement 'div'
        MediaQueries.JS_EL.className = MediaQueries.EL_CLASSNAME
        document.body.appendChild MediaQueries.JS_EL

        MediaQueries.SMALL_BREAKPOINT  = {name: "Small", breakpoints: [MediaQueries.SMALL]}
        MediaQueries.MEDIUM_BREAKPOINT = {name: "Medium", breakpoints: [MediaQueries.MEDIUM]}
        MediaQueries.LARGE_BREAKPOINT  = {name: "Large", breakpoints: [MediaQueries.IPAD, MediaQueries.LARGE, MediaQueries.EXTRA_LARGE]}

        MediaQueries.BREAKPOINTS = [
            MediaQueries.SMALL_BREAKPOINT
            MediaQueries.MEDIUM_BREAKPOINT
            MediaQueries.LARGE_BREAKPOINT
        ]
        return

    @getDeviceState : =>

        re = /(\'|\")/

        value = window.getComputedStyle(MediaQueries.JS_EL).getPropertyValue("content")
        if re.test(value.charAt(0)) and re.test(value.charAt(value.length-1)) then value = value.substr(1, value.length-2)

        return value

    @getBreakpoint : =>

        state = MediaQueries.getDeviceState()

        for i in [0...MediaQueries.BREAKPOINTS.length]
            if MediaQueries.BREAKPOINTS[i].breakpoints.indexOf(state) > -1
                return MediaQueries.BREAKPOINTS[i].name

        return ""

    @isBreakpoint : (breakpoint) =>

        for i in [0...breakpoint.breakpoints.length]
            
            if breakpoint.breakpoints[i] == MediaQueries.getDeviceState()
                return true

        return false

window.MediaQueries = MediaQueries

module.exports = MediaQueries
