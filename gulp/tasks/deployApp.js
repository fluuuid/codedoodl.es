var gulp       = require('gulp');
var shell      = require('gulp-shell');
var uploadToS3 = require('../../utils/uploadToS3');

gulp.task('deployApp', ['build'], function() {

	uploadToS3.uploadAssets(function() {

		console.log('\n');
		console.log('Upload successful, deploying with EB CLI...');
		console.log('\n');

		return gulp.src('*.js', {read: false})
			.pipe(shell([
				'git aws.push'
			]));

	});

});
