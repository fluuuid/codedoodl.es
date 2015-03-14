#!/usr/bin/env node

// config is coffee....
require('coffee-script/register');

var fs        = require('fs');
var path      = require('path');
var wrench    = require('wrench');
var colors    = require('colors');
var cloneRepo = require('./cloneRepo.js')
var config    = require('../config/repository');

var appDir     = path.resolve(__dirname, '../'+config.REPO_APP_DIR);
var doodlesDir = path.resolve(__dirname, '../'+config.REPO_DOODLE_DIR);

function copyFiles(from, to) {

  wrench.copyDirSyncRecursive(from, to, { forceDelete: true });
  console.log('copied from '+from+' to '+to);

}
 
var deploy = function(app, data) {

  cloneRepo.clone(config.REPO_NAME, config.REPO_DEPLOY_BRANCH, function(cloneData) {

    if (app) copyFiles(cloneData.repoDir+'/'+config.REPO_APP_DIR, appDir);
    if (data) copyFiles(cloneData.repoDir+'/'+config.REPO_DOODLE_DIR, doodlesDir);

    cloneRepo.cleanUp(cloneData.id);

  });

}

var deployAll = function() {

  deploy(true, true);

}

var deployApp = function() {

  deploy(true, false);
  
}

var deployData = function() {

  deploy(false, true);
  
}

module.exports = {
  deployAll  : deployAll,
  deployApp  : deployApp,
  deployData : deployData
};
