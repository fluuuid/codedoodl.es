class NumberUtils

    @MATH_COS: Math.cos 
    @MATH_SIN: Math.sin 
    @MATH_RANDOM: Math.random 
    @MATH_ABS: Math.abs
    @MATH_ATAN2: Math.atan2

    @limit:(number, min, max)->
        return Math.min( Math.max(min,number), max )

    @getRandomColor: ->

        letters = '0123456789ABCDEF'.split('')
        color = '#'
        for i in [0...6]
            color += letters[Math.round(Math.random() * 15)]
        color

    @getTimeStampDiff : (date1, date2) ->

        # Get 1 day in milliseconds
        one_day = 1000*60*60*24
        time    = {}

        # Convert both dates to milliseconds
        date1_ms = date1.getTime()
        date2_ms = date2.getTime()

        # Calculate the difference in milliseconds
        difference_ms = date2_ms - date1_ms

        # take out milliseconds
        difference_ms = difference_ms/1000
        time.seconds  = Math.floor(difference_ms % 60)

        difference_ms = difference_ms/60 
        time.minutes  = Math.floor(difference_ms % 60)

        difference_ms = difference_ms/60 
        time.hours    = Math.floor(difference_ms % 24)  

        time.days     = Math.floor(difference_ms/24)

        time

    @map: ( num, min1, max1, min2, max2, round = false, constrainMin = true, constrainMax = true ) ->
        if constrainMin and num < min1 then return min2
        if constrainMax and num > max1 then return max2
        
        num1 = (num - min1) / (max1 - min1)
        num2 = (num1 * (max2 - min2)) + min2
        if round then return Math.round(num2)

        return num2

    @toRadians: ( degree ) ->
        return degree * ( Math.PI / 180 )

    @toDegree: ( radians ) ->
        return radians * ( 180 / Math.PI )

    @isInRange: ( num, min, max, canBeEqual ) ->
        if canBeEqual then return num >= min && num <= max
        else return num >= min && num <= max

    # convert metres in to m / KM
    @getNiceDistance: (metres) =>

        if metres < 1000

            return "#{Math.round(metres)}M"

        else

            km = (metres/1000).toFixed(2)
            return "#{km}KM"

module.exports = NumberUtils
