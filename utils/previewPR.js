#!/usr/bin/env node

// config is coffee....
require('coffee-script/register');

var resolve = require('path').resolve;
var express = require('express');
var app     = express();
var colors  = require('colors');
var config  = require('../config/server');

var path;

try {
  path = resolve(process.argv[2]);
} catch (e) {
  console.log(colors.red('Please provide directory structure for doodle to test relative to root, eg '));
  console.log(colors.red('`$ node utils/checkPageSize.js doodles/doodle-author/doodle-name`'));
  return;
}

app.use(express.static(path));

app.listen(config.express_preview.port, config.express_preview.ip, function(error) {

  if (error) {
    console.error("Unable to listen for connections", error)
    process.exit(10)
  }

  process.stdin.resume();

  console.log('\n//////////////////////////////////////////////////\n');
  console.log(colors.grey('Serving %s on port %s\n'), path, config.express_preview.port);
  console.log('Please check preview on http://127.0.0.1:'+config.express_preview.port+'');
  console.log('To terminate this server, please type "exit" - if you cancel the process manually');
  console.log('then the temporary directories you just created won\'t be cleaned up :)\n');
  console.log('//////////////////////////////////////////////////\n');
 
  process.stdin.on('data', function(data) {
    data = data.toString().trim();

    if (data === 'exit') {
      console.log('exiting, bitch');
      process.exit();
    } else {
      console.log('>>> Please type "exit" to stop server and cleanup temp files');
    }
  });

});
