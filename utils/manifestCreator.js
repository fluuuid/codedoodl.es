// from https://gist.github.com/jay3sh/1236634

var questions = [
  { id: 'name', text: 'Doodle name', answerType: 'str', required: true },
  { id: 'author.name', text: 'Author name', answerType: 'str', required: true },
  { id: 'author.website', text: 'Author website', answerType: 'url', required: true },
  { id: 'author.twitter', text: 'Author twitter handle (leave blank if don\'t have one)', answerType: 'twitter', required: false },
  { id: 'description', text: 'Doodle description', answerType: 'str', required: true },
  { id: 'category', text: 'Doodle category', answerType: 'category', required: true },
  { id: 'tags', text: 'Doodle tags', answerType: 'tags', required: true }
];

var currentQuestion, currentQuestionIdx = 0, answers = {};
 
function create(returnCb) {

  function ask(question, callback) {
   
    process.stdin.resume();
    process.stdout.write(question + ": ");
   
    process.stdin.once('data', function(data) {
      data = data.toString().trim();
      callback(data);
    });

  }

  function process_val(val) {

    answers[currentQuestion.id] = val;

    if(currentQuestionIdx<questions.length-1) {
      currentQuestion = questions[++currentQuestionIdx];
      ask(currentQuestion.text, process_val);
    } else {
      process.stdin.pause();
      returnCb(answers);
    }

  }

  // function validate_answer(answer) {

  // }
 
  currentQuestion = questions[0];
  ask(currentQuestion.text, process_val);

}

module.exports = { create : create };
