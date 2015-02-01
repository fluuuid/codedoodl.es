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

    @setup : =>

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

        return window.getComputedStyle(document.body, "after").getPropertyValue("content");

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

module.exports = MediaQueries