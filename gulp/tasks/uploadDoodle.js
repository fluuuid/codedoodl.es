// config is coffee....
require('coffee-script/register');

var gulp                 = require('gulp');
var gzip                 = require('gulp-gzip');
var uglify               = require('gulp-uglify');
var shell                = require('gulp-shell');
var fs                   = require('fs');
var uploadToS3           = require('../../utils/uploadToS3');
var validatePath         = require('../../utils/validateDoodleDirPath');
var validateDoodleUpload = require('../../utils/validateDoodleUpload');
var invalidateCloudfront = require('../../utils/invalidateCloudfront');
var config               = require('../../config/server');

var argv = require('yargs')
	.alias('p', 'path')
	.argv;

function uploadDoodle(doodleDir) {
	var templateData = {
		url : 'http://' + config.buckets.SOURCE + '/' + doodleDir + '/index.html'
	};

	uploadToS3.uploadDoodleLive(doodleDir, function() {

		console.log('\n');
		console.log('Doodle uploaded to %s', templateData.url);
		console.log('\n');

		return gulp.src('*.js', {read: false})
			.pipe(shell([
				'open <%= url %>'
			], { templateData : templateData }));

	});

}

gulp.task('uploadDoodle', ['_gzipDoodle'], function() {
	var doodleDir = argv.path;

	uploadDoodle(doodleDir);

	// validateDoodleUpload(doodleDir, function(err) {

	// 	if (err) {
	// 		uploadDoodle(doodleDir);
	// 	} else {
	// 		invalidateCloudfront.doodle(doodleDir, function(err) {
	// 			if (err) {
	// 				throw new Error('Problem invalidating cloudfront cache for ' + doodleDir, err);
	// 			}
	// 			uploadDoodle(doodleDir);
	// 		});
	// 	}
	// });

});

gulp.task('_gzipDoodle', ['_copyOriginal'], function() {
	var doodleDir = argv.path;
	var path      = validatePath('./doodles/', doodleDir);
	var sources   = [
		path + '/**/*.{css,js,svg,gz,html,xml,json}',
		'!' + path + '/manifest.json',
		'!' + path + '/_original/**/*'
	];

	return gulp.src(sources)
		.pipe(gzip({ append: false }))
		.pipe(gulp.dest(path));
});

gulp.task('_copyOriginal', function() {
	var doodleDir = argv.path;
	var path       = validatePath('./doodles/', doodleDir);
	var clonedPath = path + '/_original';
	var sources    = [
		path + '/**/*.{css,js,svg,gz,html,xml,json}',
		'!' + path + '/manifest.json'
	];

	fs.mkdirSync(clonedPath);

	return gulp.src(sources)
		.pipe(gulp.dest(clonedPath));
});
