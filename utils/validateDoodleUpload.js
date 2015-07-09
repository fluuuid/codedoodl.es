// config is coffee....
require('coffee-script/register');

var request = require('request');
var config  = require('../config/server');

module.exports = function validateDoodleUpload(doodleDir, cb) {
	// for some reason, `request` is caching requests to cloudfront domain,
	// so let's use the absolute bucket URL for source instead
	var doodleUrl = 'http://' + config.buckets.SOURCE_S3_URL + '/' + doodleDir + '/index.html';

	request(doodleUrl, function(err, res, body) {
		if (!err && res.statusCode == 200) {
			console.log('I can confirm that doodle exists at %s', doodleUrl);
			cb(null);
		} else {
			cb(true)
		}
	});
}
