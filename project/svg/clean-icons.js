var inputSass  = 'compiled/iconizr-svg-sprite.scss',
	outputSass = '../sass/icons.scss',
	inputSvg   = 'compiled/ss-icons/ss-icons.svg',
	outputSvg  = '../../website/static/img/ss/ss-icons.svg',
	bgImageUrl = '../static/img/ss/ss-icons.svg',
	fs         = require('fs');


var cleanSassFile = function( inName, outName ) {

	fs.readFile(inName, 'utf8', function(err, data){

		if(err) {
			console.log(err);
			return;
		}

		data = data.replace(/\s*background\-image: url\(\'ss\-icons(\/|\\)ss\-icons\.svg\'\);/g, '');

		data = data.replace(/\s\}\s*\.ss\-[a-zA-Z0-9_-]+\-dims\s*\{/mg, '');
		data = data.replace(/\,\s*\.ss\-[a-zA-Z0-9_-]+\\\:regular/mg, '');

		data = data.replace(/%ss\s\{/, '%ss {\n\tbackground-image: url('+ bgImageUrl + ');');

		fs.writeFile(outName, data, 'utf8', function(err){
			if (err) return console.log(err);
			console.log("CLEANED: " + inName + ' > ' + outName);
		});

	});

}

var moveFile = function( inName, outName ) {

	fs.createReadStream(inName).pipe(fs.createWriteStream(outName));
	console.log("MOVED: " + inName + ' > ' + outName);

}

cleanSassFile(inputSass, outputSass);
moveFile(inputSvg, outputSvg);
