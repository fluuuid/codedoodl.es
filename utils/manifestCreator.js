// from https://gist.github.com/jay3sh/1236634

// config is coffee....
require('coffee-script/register');

var validURL = require('valid-url');
var colors   = require('colors');
var config   = require('../config/doodles');

var questions = [
  { id: 'name', text: 'Doodle name', answerType: 'str', required: true },
  { id: 'author.name', text: 'Author name', answerType: 'str', required: true },
  { id: 'author.github', text: 'Author github username', answerType: 'github', required: true },
  { id: 'author.website', text: 'Author website', answerType: 'url', required: true },
  { id: 'author.twitter', text: 'Author twitter handle, without the "@" (leave blank if don\'t have one)', answerType: 'str', required: false },
  { id: 'description', text: 'Doodle description', answerType: 'str', required: true },
  { id: 'tags', text: 'Doodle tags (comma separated list)', answerType: 'tags', required: true },
  { id: 'interaction.mouse', text: 'Mouse interaction enabled? (y/n)', answerType: 'bool', required: true },
  { id: 'interaction.keyboard', text: 'Keyboard interaction enabled? (y/n)', answerType: 'bool', required: true },
  { id: 'interaction.touch', text: 'Touch interaction enabled? (y/n)', answerType: 'bool', required: true },
  { id: 'instructions', text: 'Instructions', answerType: 'strInstructions', required: true },
  { id: 'colour_scheme', text: 'Doodle colour scheme? (light/dark)', answerType: 'colour_scheme', required: true },
  { id: 'mobile_friendly', text: 'Doodle mobile friendly? (y/n)', answerType: 'bool', required: true }
];

var currentQuestion, currentQuestionIdx = 0, answers = {};
 
function create(callback) {

  function ask(question) {
   
    process.stdin.resume();
    process.stdout.write('\033[90m'+question.text+': \033[0m');
   
    process.stdin.once('data', function(data) {
      data = data.toString().trim();
      process_val(question, data);
    });

  }

  function process_val(question, val) {

    if (validate_answer(question, val)) {
      set_manifest_prop(question, val);
    } else {
      return ask(currentQuestion);
    }

    if(currentQuestionIdx<questions.length-1) {
      currentQuestion = questions[++currentQuestionIdx];
      ask(currentQuestion);
    } else {
      // set_manifest_timestamp();
      callback(answers);
      process.stdin.pause();
    }

  }

  function validate_answer(question, answer) {

    var ret = false;
    var ghRe = new RegExp('^[a-z0-9-]{1,38}$', 'i');

    if (question.required && !answer) {

      console.log(colors.red('Please provide a value for %s'), question.text);

    } else if (question.answerType === 'url' && !validURL.isWebUri(answer)) {

      console.log(colors.red('Please provide a valid URL for %s'), question.text);

    } else if (question.answerType === 'bool' && (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'n')) {

      console.log(colors.red('Please give answer "y" or "n" for %s'), question.text);

    } else if (question.answerType === 'github' && (!ghRe.test(answer) || answer.charAt(0) === '-')) {

      console.log(colors.red('Please provide a valid github username (alphanumeric or dashes, cannot start with dash, <39 chars) for %s'), question.text);

    } else if (question.answerType === 'strInstructions' && answer.length > 35) {

      console.log(colors.red('Please ensure text is not longer than 35 character  %s'), question.text);

    } else if (question.answerType === 'colour_scheme' && (answer !== 'light' && answer !== 'dark')) {

      console.log(colors.red('Please a general colour scheme for your doodle - is it generally dark or light?  %s'), question.text);

    } else {

      ret = true;

    }

    return ret;

  }

  function set_manifest_prop(question, val) {

    var propParts = question.id.split('.');

    if (question.answerType === 'tags') {
      val = val
        .toLowerCase()
        .replace(/(^,)|(,$)/g, "")
        .split(',')
        .map(function(str){
          return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '').replace(/\s+/g, '-');
        });
    }

    if (question.answerType === 'bool') {
      val = val.toLowerCase() === 'y';
    }

    if (propParts.length > 1) {
      if (typeof(answers[propParts[0]]) !== 'object') answers[propParts[0]] = {};
      answers[propParts[0]][propParts[1]] = val;
    } else {
      answers[question.id] = val;
    }

  }

  function set_manifest_timestamp() {

    answers.created = new Date().toString();

  }
 
  currentQuestion = questions[0];
  ask(currentQuestion);

}

module.exports = { create : create };
