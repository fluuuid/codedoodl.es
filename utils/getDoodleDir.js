// config is coffee....
require('coffee-script/register');

var slug   = require('slug');
var colors = require('colors');
var config = require('../config/repository');

var getFullPath = function(manifest) {

	authorDir = getAuthorDir(manifest.author.github);
    doodleDir = getDoodleDir(manifest.name);

    return config.REPO_DOODLE_DIR+'/'+authorDir+'/'+doodleDir

}

var getAuthorDir = function(name) {

	return slug(name.replace(/\s+/g, '-').toLowerCase());
	
}

var getDoodleDir = function(name) {

	return slug(name.replace(/\s+/g, '-').toLowerCase());
	
}

module.exports = {
	getFullPath  : getFullPath,
	getAuthorDir : getAuthorDir,
	getDoodleDir : getDoodleDir
};