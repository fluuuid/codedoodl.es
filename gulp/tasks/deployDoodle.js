var gulp                  = require('gulp');
var fs                    = require('fs');
var argv                  = require('yargs').argv;
var shell                 = require('gulp-shell');
var masterManifestManager = require('../../utils/masterManifestManager');
var validatePath          = require('../../utils/validateDoodleDirPath');
var validateDoodleUpload  = require('../../utils/validateDoodleUpload');

gulp.task('deployDoodle', function() {
	var doodleDir = argv.path;
	var templateData = { doodleDir : doodleDir };

	validatePath('./doodles/', doodleDir);

	validateDoodleUpload(doodleDir, function(err) {

		if (err) {
			console.log('\n');
			console.log('Doodle cannot be deployed if it hasn\'t been uploaded to S3 first! Check `gulp uploadDoodle` before running this task.');
			console.log('\n');
			throw new Error('Failed to confirm SOURCE existance of doodle at ' + doodleDir, err);
		}

		masterManifestManager.updateAndUpload(doodleDir, function() {

			console.log('\n');
			console.log('Master manifest upload successful, committing new doodle to repo');
			console.log('\n');

			return gulp.src('*.js', {read: false})
				.pipe(shell([
					'git add doodles/master_manifest.json',
					'git add doodles/<%= doodleDir %>/manifest.json'
				], { templateData : templateData }));

		});
		
	});

});
