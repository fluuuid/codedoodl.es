var fs = require('fs');

module.exports = function(prefix, doodleDir) {
    var path;

    if (!doodleDir) {
        throw new Error('Need to provide a path as argument in format `--path username/doodleName`');
    }

    try {
        if (fs.lstatSync('doodles/'+doodleDir).isDirectory()) {
            path = prefix+doodleDir;
        }
    }
    catch (e) {
        throw new Error('Path provided for doodle is wrong / empty, remember just pass `--path username/doodleName`');
    }

    return path;
};
