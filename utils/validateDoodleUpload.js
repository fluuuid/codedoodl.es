// config is coffee....
require('coffee-script/register');

var request = require('request');
var config  = require('../config/server');

module.exports = function validateDoodleUpload(doodleDir, cb) {
	var doodleUrl = 'http://' + config.buckets.SOURCE + '/' + doodleDir + '/index.html';

	request(doodleUrl, function(err, res, body) {
		if (!err && res.statusCode == 200) {
			console.log('I can confirm that doodle exists at %s', doodleUrl);
			cb(null);
		} else {
			cb(true)
		}
	});
}
