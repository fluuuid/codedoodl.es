var gulp         = require('gulp');
var gzip         = require('gulp-gzip');
var uglify       = require('gulp-uglify');
var shell        = require('gulp-shell');
var gulpFilter   = require('gulp-filter');
var fs           = require('fs');
var argv         = require('yargs').argv;
var uploadToS3   = require('../../utils/uploadToS3');
var validatePath = require('../../utils/validateDoodleDirPath');
var config       = require('../../config/server');

gulp.task('uploadDoodle', ['_gzipDoodle'], function() {
	var doodleDir = argv.path;
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

});

gulp.task('_gzipDoodle', function() {
	var doodleDir = argv.path;
	var jsFilter = gulpFilter('**/*.js');
	var path = validatePath('./doodles/', doodleDir);

	return gulp.src(path + '/**/*.{css,js,svg,gz,html,xml,json}')
		.pipe(jsFilter)
		.pipe(uglify())
		.pipe(jsFilter.restore())
		.pipe(gzip({ append: false }))
		.pipe(gulp.dest(path));
});
