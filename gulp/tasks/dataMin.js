var gulp       = require('gulp');
var prettyData = require('gulp-pretty-data');
var gzip       = require('gulp-gzip');
var pkg        = require('../../package.json');

gulp.task('dataMin', function() {
  gulp.src(pkg.folders.src+'/data/**/*.{xml,json}')
    .pipe(prettyData({type: 'minify', preserveComments: false}))
    .pipe(gzip({ append: false }))
    .pipe(gulp.dest(pkg.folders.dest+'/data'))
});