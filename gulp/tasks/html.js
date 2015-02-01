var gulp         = require('gulp');
var gutil        = require('gulp-util');
var replace      = require('gulp-replace');
var minifyHTML   = require('gulp-minify-html');
var minifyInline = require('gulp-minify-inline');
var gutil        = require('gulp-util');
var pkg          = require('../../package.json');

gulp.task('html', function () {

	var manifest = {};

	// use versioned assets if going to production, otherwise use default paths
	if (!global.isWatching) {
		try {
			manifest = require('../../rev-manifest.json');
		} catch (e) {
			gutil.log('\'' + gutil.colors.cyan('html') + '\' - no manifest, using defaults');
		}
	}

	return gulp.src(pkg.folders.src+'/html/*.html')
		.pipe(replace(/\{{ ([^{}]*) \}}/g, function(a, b) {
			var r = manifest[b];
			return r && (typeof r === 'string' || typeof r === 'number') ? r : b;
		}))
		.pipe(global.isWatching ? gutil.noop() : minifyInline())
		.pipe(global.isWatching ? gutil.noop() : minifyHTML())
		.pipe(gulp.dest(pkg.folders.dest));

});