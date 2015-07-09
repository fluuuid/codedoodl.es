var gulp                  = require('gulp');
var fs                    = require('fs');
var shell                 = require('gulp-shell');
var masterManifestManager = require('../../utils/masterManifestManager');
var validatePath          = require('../../utils/validateDoodleDirPath');
var validateDoodleUpload  = require('../../utils/validateDoodleUpload');

var argv = require('yargs')
	.alias('p', 'path')
	.alias('pr', 'production')
	.argv;

gulp.task('deployDoodle', function() {
	var doodleDir    = argv.path;
	var isProduction = argv.production;

	var templateData         = { doodleDir : doodleDir };
	var updateManifestMethod = isProduction ? 'updateAndUploadProd' : 'updateAndUploadDev';

	validatePath('./doodles/', doodleDir);

	validateDoodleUpload(doodleDir, function(err) {

		if (err) {
			console.log('\n');
			console.log('Doodle cannot be deployed if it hasn\'t been uploaded to S3 first! Check `gulp uploadDoodle` before running this task.');
			console.log('\n');
			throw new Error('Failed to confirm SOURCE existance of doodle at ' + doodleDir, err);
		}

		masterManifestManager[updateManifestMethod](doodleDir, function() {

			console.log('\n');
			console.log('Master manifest upload successful');
			console.log('\n');

			if (!isProduction) {
				return false;
			}

			console.log('\n');
			console.log('Committing new doodle to repo');
			console.log('\n');

			return gulp.src('*.js', {read: false})
				.pipe(shell([
					'git add doodles/master_manifest.json',
					'git add doodles/<%= doodleDir %>/manifest.json'
				], { templateData : templateData }));

		});
		
	});

});
