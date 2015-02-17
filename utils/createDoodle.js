#!/usr/bin/env node

var fs              = require('fs');
var mkdirp          = require('mkdirp');
var slug            = require('slug');
var figlet          = require('figlet');
var manifestCreator = require('./manifestCreator.js');

var fullDoodleDir;

var indexTmpl = [
  "<!DOCTYPE html>\n",
  "<html lang=\"en\">\n",
  "<head>\n",
    "\t<title>{{ name }}</title>\n",
  "</head>\n",
  "<body></body>\n",
  "</html>\n",
].join('');

function writeManifestFile(manifest) {

  var manifestFilename = fullDoodleDir+'/manifest.json';

  fs.writeFile(manifestFilename, JSON.stringify(manifest, null, 4), function(err) {
    if(err) {
      console.dir(err);
    } else {
      console.log("\033[32mManifest written to " + manifestFilename + "\033[0m");
    }
  });
    
}

function writeIndexFile(manifest) {

  var indexFilePath = fullDoodleDir+'/index.html';
  var html          = indexTmpl.replace('{{ name }}', manifest.name+' | '+manifest.author.name);

  fs.writeFile(indexFilePath, html, function(err) {
    if(err) {
      console.dir(err);
    } else {
      console.log("\033[32mIndex HTML written to " + indexFilePath + "\033[0m");
    }
}); 

}

function main() {

  manifestCreator.create(function(manifest) {

    var authorDir = slug(manifest.author.name.replace(/\s+/g, '-').toLowerCase());
    var doodleDir = slug(manifest.name.replace(/\s+/g, '-').toLowerCase());
    fullDoodleDir = 'doodles/'+authorDir+'/'+doodleDir;

    mkdirp(fullDoodleDir, function(err) {
      if (err) {
        console.log(err);
      } else {
        console.log("\033[32mDoodle directory created at " + fullDoodleDir + "\033[0m")
        writeManifestFile(manifest);
        writeIndexFile(manifest);
      }
    });

  });

}

figlet('codedoodl.es', { font: 'cyberlarge' }, function(err, data) {

  if (err) {
    console.dir(err);
  } else {
    console.log('');
    console.log(data);
    console.log('');
    console.log('  Use this tool to generate directory structure and doodle manifest');
    console.log('  Don\'t worry - you can edit it anytime after initial generation')
    console.log('');
    main();
  }

});
