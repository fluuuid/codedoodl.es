class DateUtils

	# dateString should be in dd/mm/yy format

	@getLocalDate : ( dateString, timeString, dayCorrection = 0 ) ->

		splited = dateString.split '/'
		dateString = [splited[1], splited[0], "20" + splited[2]].join '/'
		d = new Date "#{dateString} #{timeString} UTC"
		timestamp = d.getTime() + 10800000 + dayCorrection * 86400000

		return new Date timestamp

module.exports = DateUtils
