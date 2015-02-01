/* browserify task
   ---------------
   Bundle javascripty things with browserify!

   If the watch task is running, this uses watchify instead
   of browserify for faster bundling using caching.
*/

var gulp         = require('gulp');
var browserify   = require('browserify');
var watchify     = require('watchify');
var uglify       = require('gulp-uglify');
var source       = require('vinyl-source-stream');
var buffer       = require('vinyl-buffer');
var gutil        = require('gulp-util');
var stripDebug   = require('gulp-strip-debug');
var bundleLogger = require('../util/bundleLogger');
var handleErrors = require('../util/handleErrors');
var pkg          = require('../../package.json');

gulp.task('browserify', function() {

  var bundler = browserify({
    // Required watchify args
    cache: {}, packageCache: {}, fullPaths: false,
    // Browserify Options
    entries: ['./'+pkg.folders.src+'/coffee/Main.coffee'],
    // Add file extensions to make optional in your requires
    extensions: ['.coffee'],
    // Enable source maps!
    debug: global.isWatching
  });

  var bundle = function() {

    // Log when bundling starts
    bundleLogger.start();

    return bundler
      .bundle()
      // Report compile errors
      .on('error', handleErrors)

      // Use vinyl-source-stream to make the
      // stream gulp compatible. Specifiy the
      // desired output filename here.
      .pipe(source('main.js'))

			// if not watching, prepare for production
      .pipe(buffer())
      .pipe(global.isWatching ? gutil.noop() : stripDebug())
			.pipe(global.isWatching ? gutil.noop() : uglify())

      // Specify the output destination
      .pipe(gulp.dest('./'+pkg.folders.dest+'/js/'))

      // Log when bundling completes!
      .on('end', bundleLogger.end);
  };

  if(global.isWatching) {
    bundler = watchify(bundler);
    bundler.on('update', bundle);
  }

  return bundle();
});