#!/usr/bin/env node

// config is coffee....
require('coffee-script/register');

var phantomas   = require('phantomas');
var resolve     = require('path').resolve;
var connect     = require('connect');
var serveStatic = require('serve-static');
var pretty      = require('prettysize');
var colors      = require('colors');
var config      = require('../config/doodles');

var PORT = 3000;

var path;

var server = connect();

try {
	path = resolve(process.argv[2]);
} catch (e) {
	console.log(colors.red('Please provide directory structure for doodle to test relative to root, eg '));
	console.log(colors.red('`$ node utils/checkPageSize.js doodles/doodle-author/doodle-name`'));
	return;
}

function checkResults(requestCount, pageSize) {

	if (requestCount <= config.MAX_REQUEST_COUNT) {
		console.log(colors.green('Request count is within limit (%s / %s)'), requestCount, config.MAX_REQUEST_COUNT);
	} else {
		console.log(colors.red('Request count is outside of limit (%s / %s)'), requestCount, config.MAX_REQUEST_COUNT);
	}

	if (pageSize <= config.MAX_PAGE_SIZE) {
		console.log(colors.green('Page size is within limit (%s / %s)'), requestCount, config.MAX_REQUEST_COUNT);
	} else {
		console.log(colors.red('Page size is outside of limit (%s / %s)'), requestCount, config.MAX_REQUEST_COUNT);
	}

}

server.use(serveStatic(path));

server.listen(PORT, function () {

	console.log(colors.grey('Serving %s on port %s'), path, PORT);

	phantomas('http://localhost:'+PORT, function(err, json, results) {

		checkResults(results.getMetric('requests'), results.getMetric('bodySize'));
		process.exit();

	});

});
