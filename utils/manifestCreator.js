// from https://gist.github.com/jay3sh/1236634

var validURL = require('valid-url');
var config   = require('../config');

var questions = [
  { id: 'name', text: 'Doodle name', answerType: 'str', required: true },
  { id: 'author.name', text: 'Author name', answerType: 'str', required: true },
  { id: 'author.website', text: 'Author website', answerType: 'url', required: true },
  { id: 'author.twitter', text: 'Author twitter handle, without the "@" (leave blank if don\'t have one)', answerType: 'str', required: false },
  { id: 'description', text: 'Doodle description', answerType: 'str', required: true },
  { id: 'category', text: 'Doodle category (choose a single value from ['+config.CATEGORIES+'])', answerType: 'category', required: true },
  { id: 'tags', text: 'Doodle tags (comma separated list)', answerType: 'tags', required: true }
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
      process.stdin.pause();
      callback(answers);
    }

  }

  function validate_answer(question, answer) {

    var ret = false;

    if (question.required && !answer) {
      console.log('\033[31mPlease provide a value for "'+question.text+'"\033[0m');
    } else if (question.answerType === 'url' && !validURL.isWebUri(answer)) {
      console.log('\033[31mPlease provide a valid URL for "'+question.text+'"\033[0m');
    } else if (question.answerType === 'category' && config.CATEGORIES.indexOf(answer) === -1) {
      console.log('\033[31mPlease choose a category from : ['+config.CATEGORIES+']\033[0m');
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
        .split(',')
        .map(function(str){
          return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '').replace(/\s+/g, '-');
        });
    }

    if (propParts.length > 1) {
      if (typeof(answers[propParts[0]]) !== 'object') answers[propParts[0]] = {};
      answers[propParts[0]][propParts[1]] = val;
    } else {
      answers[question.id] = val;
    }

  }
 
  currentQuestion = questions[0];
  ask(currentQuestion);

}

module.exports = { create : create };
