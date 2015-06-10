#!/usr/bin/env node

// config is coffee....
require('coffee-script/register');

var fs         = require('fs');
var Hashids    = require('hashids');
var uploadToS3 = require('./uploadToS3');
var config     = require('../config/server');

var manifestPath = "doodles/master_manifest.json";

function update(doodleDir) {

	var manifest = JSON.parse(fs.readFileSync(manifestPath, { encoding : 'utf8' }));
	var doodles  = manifest.doodles;
	var found = false;

	doodles.forEach(function(doodle) {
		if (doodle.slug === doodleDir) {
			found = true;
			doodle.created = new Date()
		}
	});

	if (!found) {
		doodles.push(getNewEntry(doodleDir, doodles.length));
	}

	manifest.last_updated = new Date();

	fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 4));
}

function getNewEntry(doodleDir, index) {
	var h = new Hashids(config.shortlinks.SALT, 3, config.shortlinks.ALPHABET);
    var shortlink = h.encode(index);

    return {
		id      : shortlink,
		slug    : doodleDir,
		created : new Date()
	};
}

function updateAndUpload(doodleDir, cb) {

	update(doodleDir);
	uploadToS3.uploadSingleFile(manifestPath, cb);

}

module.exports = {
	updateAndUpload : updateAndUpload
}
