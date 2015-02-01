var gulp   = require('gulp');
var rimraf = require('gulp-rimraf');
var filter = require('gulp-filter');
var rev    = require('gulp-rev');
var pkg    = require('../../package.json');

var exts    = ['css', 'js'];
var re      = new RegExp('(-[a-z0-9]{8})(.('+exts.join('|')+'))$', 'i');

var src     = pkg.folders.dest+'/**/*.{'+exts.join(',')+'}';
var dest    = pkg.folders.dest;

gulp.task('_versionCleanAssets', function () {

    return gulp.src(src)
        .pipe(rev())
        .pipe(gulp.dest(dest))
        .pipe(rev.manifest())
        .pipe(gulp.dest('./'));

});

gulp.task('revAssets', ['_versionCleanAssets'], function () {

    var unHashedFilter = filter(function (file) { return !re.test(file.path); });

    return gulp.src(src)
        .pipe(unHashedFilter)
        .pipe(rimraf());

});
