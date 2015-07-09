#!/usr/bin/env node

// config is coffee....
require('coffee-script/register');

var fs                   = require('fs');
var Hashids              = require('hashids');
var uploadToS3           = require('./uploadToS3');
var invalidateCloudfront = require('./invalidateCloudfront');
var config               = require('../config/server');

var manifestPathProd = "doodles/master_manifest.json";
var manifestPathDev  = "doodles/master_manifest_DEV.json";

function update(isProduction, doodleDir) {

	var manifestPath = isProduction ? manifestPathProd : manifestPathDev;
	var manifest     = JSON.parse(fs.readFileSync(manifestPath, { encoding : 'utf8' }));
	var doodles      = manifest.doodles;
	var found        = false;

	doodles.forEach(function(doodle) {
		if (doodle.slug === doodleDir) {
			found = true;
			doodle.created = new Date()
		}
	});

	if (!found) {
		doodles.push(getNewEntry(doodleDir, doodles.length+1));
	}

	manifest.last_updated = new Date();

	fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 4));
}

function getNewEntry(doodleDir, index) {
	var h = new Hashids(config.shortlinks.SALT, 3, config.shortlinks.ALPHABET);
    var shortlink = h.encode(index);

    return {
		id      : shortlink,
		index   : index,
		slug    : doodleDir,
		created : new Date()
	};
}

function updateAndUpload(isProduction, doodleDir, cb) {

	var manifestPath       = isProduction ? manifestPathProd : manifestPathDev;
	var remoteManifestPath = manifestPath.replace('doodles/', '');

	update(isProduction, doodleDir);

	invalidateCloudfront.file(remoteManifestPath, function(err) {
		if (err) {
			throw new Error('Problem invalidating cloudfront cache for ' + manifestPath, err);
		}
		uploadToS3.uploadSingleFile(manifestPath, cb);
	});

}

module.exports = {
	update              : update,
	updateAndUploadProd : updateAndUpload.bind(null, true),
	updateAndUploadDev  : updateAndUpload.bind(null, false)
}
