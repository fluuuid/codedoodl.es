/* Notes:
   - gulp/tasks/browserify.js handles js recompiling with watchify
   - gulp/tasks/browserSync.js automatically reloads any files
     that change within the directory it's serving from
*/

var gulp = require('gulp');
var pkg  = require('../../package.json');

gulp.task('watch', ['setWatch', 'browserSync'], function() {
  gulp.watch(pkg.folders.src+'/sass/**', ['sass']);
  gulp.watch(pkg.folders.src+'/img/**', ['images']);
  gulp.watch(pkg.folders.src+'/data/**', ['dataMin']);
  gulp.watch(pkg.folders.src+'/vendor/**', ['vendor']);
  gulp.watch(pkg.folders.src+'/html/**', ['html']);
});
