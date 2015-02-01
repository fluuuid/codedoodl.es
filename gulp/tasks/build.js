var gulp        = require('gulp');
var runSequence = require('run-sequence');

gulp.task('build', function() {

    var args = [
        'unrevAssets',
        ['browserify', 'sass', 'vendor', 'images', 'dataMin'],
        'html',
    ];

    if (!global.isWatching) {
        args.splice(2, 0, 'revAssets');
    }

    runSequence.apply(this, args);

});
