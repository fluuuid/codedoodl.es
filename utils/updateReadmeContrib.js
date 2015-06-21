#!/usr/bin/env node

var _       = require('underscore');
var fs      = require('fs');
var path    = require('path');
var request = require('request');

var KEY = 'digital artists who have contributed doodles:';

var readmePath = path.resolve(__dirname, '../', './README.md');

function getTemplate() {

  var oldReadme = fs.readFileSync(readmePath, { encoding : 'utf8' });
  var template  = oldReadme.split(KEY)[0] + KEY + '\n\n';

  return template;
}

// template :
// [name](website) ([tw](twitter), [gh](github)) \\'
function contributorsJStoMD(contributors) {

  var string = '**';

  contributors = _.shuffle(contributors);

  contributors.forEach(function(contributor, i) {
    if (i !== 0) string += ' \\ ';
    string += '['+contributor.name+']('+contributor.website+') (';
    if (contributor.twitter) string += '[tw](http://twitter.com/'+contributor.twitter+'), ';
    string += '[gh](http://github.com/'+contributor.github+'))';
  });

  string += '**';

  return string;

}

function updateReadmeContributors() {

  var template  = getTemplate();
  var newReadme = null;

  request('http://develop.codedoodl.es/api/contributors', function(err, res, body) {
    if (!err && res.statusCode === 200) {
      newReadme = template + contributorsJStoMD(JSON.parse(body).contributors);
      fs.writeFileSync(readmePath, newReadme);
    } else {
      throw new Error('Problem getting contributors data')
    }
  });

}

updateReadmeContributors();
