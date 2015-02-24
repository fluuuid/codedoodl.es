#!/usr/bin/env node

var http    = require('http');
var fs      = require('fs');
var request = require('request');
var AdmZip  = require('adm-zip');
var path    = require('path');
var wrench  = require('wrench');
var rimraf  = require('rimraf');
var colors  = require('colors');

var latestZipDir = path.resolve(__dirname, '../latest.zip');
var tempDir      = path.resolve(__dirname, '../temp');

var appDir     = path.resolve(__dirname, '../app');
var doodlesDir = path.resolve(__dirname, '../doodles');

var opts = {
  method: 'GET',
  uri: 'https://api.github.com/repos/neilcarpenter/codedoodl.es/zipball/master',
  headers: {
    "User-Agent"    : "neilcarpenter",
    "Authorization" : "token "+process.env.GITHUB_REPO_PULL_TOKEN
  }
}

function saveZip(cb) {

  var req = request(opts);
  var out = fs.createWriteStream(latestZipDir);

  req.pipe(out);
  req.on('end', cb);

}

function unpackZip() {

  var zip = new AdmZip(latestZipDir);
  zip.extractAllTo(tempDir, true);

}

function copyFiles(cb) {

  var repoDirRoot;

  fs.readdirSync(tempDir).forEach(function(_p, i) {

    var p = tempDir+'/'+_p;
    if (fs.lstatSync(p).isDirectory()) {
      repoDirRoot = p;
    }

  });
  console.log('the temp repo dir is'+repoDirRoot);

  wrench.copyDirSyncRecursive(repoDirRoot+'/app', appDir, { forceDelete: true });
  console.log('copied main app!');

  wrench.copyDirSyncRecursive(repoDirRoot+'/doodles', doodlesDir, { forceDelete: true });
  console.log('copied doodles!');

}

function cleanUp() {

  rimraf(tempDir, function(err) {
    if (err) { console.error(err); }
    console.log('removed temp directory');
  });

  rimraf(latestZipDir, function(err) {
    if (err) { console.error(err); }
    console.log('removed latest zip');
  });

}
 
function deploy() {

  saveZip(function() {

    unpackZip();
    copyFiles();
    cleanUp();

  });

}

module.exports = { deploy : deploy };
