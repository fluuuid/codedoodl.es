var gulp       = require('gulp');
var shell      = require('gulp-shell');
var uploadToS3 = require('../../utils/uploadToS3');
var config     = require('../../config/server');

var argv = require('yargs')
	.alias('p', 'path')
	.argv;

gulp.task('previewDoodle', function() {
	var doodleDir = argv.path;
	var templateData = {
		url : 'http://' + config.buckets.PENDING + '/' + doodleDir + '/index.html'
	};

	uploadToS3.uploadDoodlePending(doodleDir, function() {

		console.log('\n');
		console.log('Previewing pending doodle at %s', templateData.url);
		console.log('\n');

		return gulp.src('*.js', {read: false})
			.pipe(shell([
				'open <%= url %>'
			], { templateData : templateData }));

	});

});
