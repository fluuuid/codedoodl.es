// config is coffee....
require('coffee-script/register');

var AWS            = require('aws-sdk');
var getCredentials = require ('./getCredentials');
var config         = require('../config/server');

function getInvalidationBatch(isDoodle, path) {
	var items = [ '/' + path + (isDoodle ? '/*' : '') ];

	return {
		CallerReference: Date.now().toString(),
		Paths: {
			Quantity: 1,
			Items: items
		}
	};
}

function invalidate(isDoodle, path, cb) {

	var creds = getCredentials();

	AWS.config.update({
		region          : creds.aws.region,
		accessKeyId     : creds.aws.id,
		secretAccessKey : creds.aws.key,
		logger: process.stdout
	});

	var cloudfront = new AWS.CloudFront();
	var invalidationOpts = {
		DistributionId    : config.cloudfront.SOURCE,
		InvalidationBatch : getInvalidationBatch(isDoodle, path)
	};

	cloudfront.createInvalidation(invalidationOpts, function(err, data) {
		if (err) {
			console.log('!!!err', err);
			cb(err);
		} else {
			console.log('Cloudfront invalidation created with id: ' + data.Invalidation.Id);
			cb(null);
		}
	});

}

module.exports = {
	doodle : invalidate.bind(null, true),
	file   : invalidate.bind(null, false)
}