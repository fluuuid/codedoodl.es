// config is coffee....
require('coffee-script/register');

var _      = require('underscore');
var fs     = require('fs');
var path   = require('path');
var colors = require('colors');
var config = require('../config/doodles');
 
function getDoodles() {

  var doodles     = [];
  var doodlesPath = path.resolve(__dirname, '../doodles');

  fs.readdirSync(doodlesPath).forEach(function(authorPath, i) {

    authorPath = doodlesPath + '/' + authorPath;

    if (fs.lstatSync(authorPath).isDirectory()) {

      fs.readdirSync(authorPath).forEach(function(doodlePath, i) {

        var manifestPath;

        doodlePath   = authorPath + '/' + doodlePath;
        manifestPath = doodlePath+'/manifest.json';

        if (fs.lstatSync(doodlePath).isDirectory()) {

          if (fs.existsSync(manifestPath)) {
            doodles.push(JSON.parse(fs.readFileSync(manifestPath, {encoding: 'utf8'})));
          } else {
            console.log(colors.red('No manifest.json found for doodle :  %s'), doodlePath);
          }

        }

      });

    }

  });

  return doodles;

}

function getContributors() {

  var authorsUniq = [];

  var authors = _.pluck(getDoodles(), 'author');
  authors = _.groupBy(authors, function(author) { return author.name; });

  _.each(authors, function(author) { authorsUniq.push(author[0]); })

  return authorsUniq;

}

module.exports = {
  getDoodles      : getDoodles,
  getContributors : getContributors
};
