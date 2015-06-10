var gulp         = require('gulp');
var request      = require('request');
var argv         = require('yargs').argv;
var shell        = require('gulp-shell');
var uploadToS3   = require('../../utils/uploadToS3');
var validatePath = require('../../utils/validateDoodleDirPath');
var config       = require('../../config/server');

function validateDoodleUpload(doodleDir, cb) {
	var doodleUrl = 'http://' + config.buckets.SOURCE + '/' + doodleDir + '/index.html';

	request(doodleUrl, function(err, res, body) {
		if (!err && res.statusCode == 200) {
			console.log('Doodle exists, proceeding to update master manifest...');
			cb();
		} else {
			console.log('\n');
			console.log('Doodle cannot be deployed if it hasn\'t been uploaded to S3 first! Check `gulp uploadDoodle` before running this task.');
			console.log('\n');
			throw new Error('Error confirming existance of doodle at ' + doodleUrl, err);
		}
	});

}

function updateManifest(doodleDir) {

	// sample entry
	// {
	// 	"id"      : "wwe",
	// 	"slug"    : "neilcarpenter/square-stream",
	// 	"created" : "Wed Jun 10 00:45:31 BST 2015"
	// }

	return "in progress...";

}

gulp.task('deployDoodle', function() {
	var doodleDir = argv.path;
	var templateData = { doodleDir : doodleDir };

	validatePath('./doodles/', doodleDir);

	validateDoodleUpload(doodleDir, function() {

		updateManifest(doodleDir);

		uploadToS3.uploadSingleFile("doodles/master_manifest.json", function() {

			console.log('\n');
			console.log('Master manifest upload successful, committing new doodle to repo');
			console.log('\n');

			// return gulp.src('*.js', {read: false})
			// 	.pipe(shell([
			// 		'git add doodles/master_manifest.json',
			// 		'git add doodles/<%= doodleDir %>/index.html',
			// 		'git add doodles/<%= doodleDir %>/manifest.json'
			// 	], { templateData : templateData }));

		});
		
	});

});
