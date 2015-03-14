#!/usr/bin/env node

// config is coffee....
require('coffee-script/register');

var fs      = require('fs');
var request = require('request');
var AdmZip  = require('adm-zip');
var path    = require('path');
var rimraf  = require('rimraf');
var mkdirp  = require('mkdirp');
var uuid    = require('node-uuid');
var colors  = require('colors');
var config  = require('../config/repository');

var tempDir = path.resolve(__dirname, '../temp');

var getRequestOpts = function(repoName, branch) {

  var opts = {
    method  : 'GET',
    uri     : 'https://api.github.com/repos/'+repoName+'/zipball/'+branch,
    headers : {
      "User-Agent"    : "codedoodl.es",
      "Authorization" : "token "+process.env.GITHUB_REPO_PULL_TOKEN
    }
  }

  return opts;

}

var saveAndUnpackZip = function(requestOpts, cb) {

  var cloneData    = { id : uuid.v1() };
  cloneData.idPath = tempDir+'/'+cloneData.id;
  cloneData.zip    = cloneData.idPath+'/archive.zip';

  mkdirp.sync(cloneData.idPath);

  // console.log('going to get for');
  // console.log(requestOpts);

  console.log('cloneData');
  console.log(cloneData);

  var req  = request(requestOpts);
  var out  = fs.createWriteStream(cloneData.zip);

  req.pipe(out);

  req.on('end', function() {
    unpackZip(cloneData, cb);
  });

}

var unpackZip = function(cloneData, cb) {

  var zip = new AdmZip(cloneData.zip);
  zip.extractAllTo(cloneData.idPath, true);

  fs.readdirSync(cloneData.idPath).forEach(function(_p, i) {

    var p = cloneData.idPath+'/'+_p;
    if (fs.lstatSync(p).isDirectory()) {
      cloneData.repoDir = p;
    }

  });

  cb(cloneData);

}

var cleanUp = function(id) {

  var dirToClean;
  var cloneCount = 0;

  fs.readdirSync(tempDir).forEach(function(_p, i) {

    if (_p === id) dirToClean = _p;
    if (fs.lstatSync(tempDir+'/'+_p).isDirectory()) cloneCount++;

  });

  if (!dirToClean) return;

  rimraf(dirToClean, function(err) {

    if (err) { console.error(err); }
    console.log('removed clone directory - '+id);

    if (cloneCount === 1) {
      rimraf(tempDir, function(err) {
        if (err) { console.error(err); }
        console.log('removed root temp dir');
      });
    }

  });

}
 
var clone = function(repoName, branch, cb) {

  var requestOpts = getRequestOpts(repoName, branch);

  saveAndUnpackZip(requestOpts, function(cloneData) {

    cb(cloneData);

  });

}

module.exports = {
  clone   : clone,
  cleanUp : cleanUp
};
