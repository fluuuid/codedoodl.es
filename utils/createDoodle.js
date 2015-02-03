#!/usr/bin/env node

var fs              = require('fs');
var mkdirp          = require('mkdirp');
var manifestCreator = require('./manifestCreator.js');

var authorDir, doodleDir;

function writeManifestFile(manifest) {

  var manifestFilename = 'website/doodles/'+authorDir+'/'+doodleDir+'/manifest.json';

  fs.writeFile(manifestFilename, JSON.stringify(manifest, null, 4), function(err) {
    if(err) {
      console.log(err);
    } else {
      console.log("answers saved to " + manifestFilename);
    }
  });
    
}

manifestCreator.create(function(manifest) {

  console.log(manifest);

  // authorDir = manifest.author.name.replace(/\s+/g, '-').toLowerCase();
  authorDir = manifest['author.name'].replace(/\s+/g, '-').toLowerCase();
  doodleDir = manifest.name.replace(/\s+/g, '-').toLowerCase();

  mkdirp('website/doodles/'+authorDir+'/'+doodleDir, function(err) {
    if (err) {
      console.log(err);
    } else {
      writeManifestFile(manifest);
    }
  });

});
