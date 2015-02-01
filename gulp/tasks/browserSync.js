var browserSync = require('browser-sync');
var gulp        = require('gulp');
var fs          = require('fs');
var pkg         = require('../../package.json');

gulp.task('browserSync', ['build'], function() {
  browserSync.init([pkg.folders.dest+'/**'], {

    server: {
      baseDir: [pkg.folders.src, pkg.folders.dest],
      middleware: function (req, res, next) {

        var filePath = req.url.split("?");

        // static route for pushstate
        var exists = fs.existsSync(process.cwd() + "/" + pkg.folders.dest + filePath[0]);
        if((req.url == "/" || !exists) && req.url.indexOf("browser-sync-client") == -1) req.url = "/index.html";

        if(filePath.length > 1) req.url += filePath[1];

        next();
      }
    }
  });
});