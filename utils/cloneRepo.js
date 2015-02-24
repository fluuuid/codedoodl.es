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
    "User-Agent"    : "codedoodl.es",
    "Authorization" : "token "+process.env.GITHUB_REPO_PULL_TOKEN
  }
}

var saveZip = function(cb) {

  var req = request(opts);
  var out = fs.createWriteStream(latestZipDir);

  req.pipe(out);
  req.on('end', cb);

}

var unpackZip = function() {

  var zip = new AdmZip(latestZipDir);
  zip.extractAllTo(tempDir, true);

}

var cleanUp = function() {

  rimraf(tempDir, function(err) {
    if (err) { console.error(err); }
    console.log('removed temp directory');
  });

  rimraf(latestZipDir, function(err) {
    if (err) { console.error(err); }
    console.log('removed latest zip');
  });

}
 
var deploy = function() {

  saveZip(function() {

    unpackZip();
    copyFiles();
    cleanUp();

  });

}

var deployAll = function() {

  
  
}

module.exports = {
  deployAll  : deployAll,
  deployApp  : deployApp,
  deployData : deployData
};
