var gulp   = require('gulp');
var rename = require('gulp-rename');
var rimraf = require('gulp-rimraf');
var filter = require('gulp-filter');
var pkg    = require('../../package.json');

var exts    = ['css', 'js'];
var re      = new RegExp('(-[a-z0-9]{8})(.('+exts.join('|')+'))$', 'i');

var src     = pkg.folders.dest+'/**/*.{'+exts.join(',')+'}';
var dest    = pkg.folders.dest;

function removeHash(path) {

    if (exts.indexOf(path.extname.substr(1)) > -1) {
        path.basename = path.basename.replace(/(-[a-z0-9]{8})$/i, '');
    }

}

gulp.task('_cleanFilenames', function () {

    return gulp.src(src)
        .pipe(rename(removeHash))
        .pipe(gulp.dest(dest));

});

gulp.task('unrevAssets', ['_cleanFilenames'], function () {

    var hashedFilter = filter(function (file) { return re.test(file.path); });

    return gulp.src(src)
        .pipe(hashedFilter)
        .pipe(rimraf());

});
