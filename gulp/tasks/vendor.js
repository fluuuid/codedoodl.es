var gulp   = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var gutil  = require('gulp-util');
var gzip   = require('gulp-gzip');
var pkg    = require('../../package.json');

gulp.task('vendor', function() {

	var source = [];
	for (var key in pkg.vendor) {
		source.push(pkg.folders.vendor +"/"+ pkg.vendor[key]);
	}

	return gulp.src(source)
		.pipe(concat('v.js'))
		.pipe(global.isWatching ? gutil.noop() : uglify())
		// always gzip, make sure headers set by server
      	.pipe(gzip({ append: false }))
		.pipe(gulp.dest(pkg.folders.dest+'/js/vendor/'));
		
});