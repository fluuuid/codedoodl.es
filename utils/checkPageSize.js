#!/usr/bin/env node

// config is coffee....
require('coffee-script/register');

var phantomas     = require('phantomas');
var resolve       = require('path').resolve;
var express       = require('express');
var app           = express();
var pretty        = require('prettysize');
var colors        = require('colors');
var configServer  = require('../config/server');
var configDoodles = require('../config/doodles');

var path;

try {
  path = resolve(process.argv[2]);
} catch (e) {
  console.log(colors.red('Please provide directory structure for doodle to test relative to root, eg '));
  console.log(colors.red('`$ node utils/checkPageSize.js doodles/doodle-author/doodle-name`'));
  return;
}

function checkResults(requestCount, pageSize) {

  if (requestCount <= configDoodles.MAX_REQUEST_COUNT) {
    console.log(colors.green('Request count is within limit (%s / %s)'), requestCount, configDoodles.MAX_REQUEST_COUNT);
  } else {
    console.log(colors.red('Request count is outside of limit (%s / %s)'), requestCount, configDoodles.MAX_REQUEST_COUNT);
  }

  if (pageSize <= configDoodles.MAX_PAGE_SIZE) {
    console.log(colors.green('Page size is within limit (%s / %s)'), pretty(pageSize), pretty(configDoodles.MAX_PAGE_SIZE));
  } else {
    console.log(colors.red('Page size is outside of limit (%s / %s)'), pretty(pageSize), pretty(configDoodles.MAX_PAGE_SIZE));
  }

}

app.use(express.static(path));

app.listen(configServer.express_preview.port, configServer.express_preview.ip, function(error) {

  if (error) {
    console.error("Unable to listen for connections", error)
    process.exit(10)
  }

  console.log(colors.grey('Serving %s on port %s'), path, configServer.express_preview.port);

  phantomas('http://'+configServer.express_preview.ip+':'+configServer.express_preview.port, function(err, json, results) {

    checkResults(results.getMetric('requests'), results.getMetric('bodySize'));
    process.exit();

  });

});
