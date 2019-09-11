var canvas = document.getElementById('canvas');
canvas.height = window.innerHeight;
canvas.width = window.innerWidth;
var ctx = canvas.getContext('2d');

var animate = null;

function stop() {
  animate = false;
}

function start() {
  animate = true;

  var spacing = 20;
  var numOfLines = canvas.height / spacing;

  var startOffset = spacing / 2;
  var quarter = (canvas.width - spacing) / 4;

  ctx.lineWidth = 10;

  var isInViewport = function isInViewport(elem) {
    var bounding = elem.getBoundingClientRect();
    //  If the bottom is in view but the top isn't then it's visible
    return bounding.bottom >= 0 && bounding.bottom <= (window.innerHeight || document.documentElement.clientHeight) || bounding.top >= 0 && bounding.top <= (window.innerHeight || document.documentElement.clientHeight);
  };

  function line(diff, n, hue) {

    var p = Math.random() * 100

    for (let y = 0; y < numOfLines; y++) {

      // yDiv will be a value between 0 and 1 (from first row to last)
      var yDiv = y / numOfLines;

      // Math.sin((Math.PI / 180) * degrees) => 0,0 90,1 180,0 270,-1, 360,0
      // so we get a value which fluctuates between 1 and -1

      var firstYShift = Math.sin(yDiv * Math.PI * 6) * (Math.sin(diff * n * 2) * 31);
      var secondYShift = Math.sin(yDiv * Math.PI * 5) * (Math.sin(diff * n * 4) * 37);
      var thirdYShift = Math.sin(yDiv * Math.PI * 4) * (Math.sin(diff * n * 6) * 43);
      var firstXShift = Math.sin(yDiv * Math.PI * 3) * (Math.sin(diff * n * 8) * 77);
      var secondXShift = Math.sin(yDiv * Math.PI * 2) * (Math.sin(diff * n * 10) * 91);
      var thirdXShift = Math.sin(yDiv * Math.PI) * (Math.sin(diff * n * 12) * 101);

      ctx.strokeStyle = 'hsla(' + hue + ', 100%, 50%, 0.4)';
      ctx.beginPath();
      ctx.moveTo(startOffset, y * spacing + startOffset);
      ctx.lineTo(startOffset + quarter + firstXShift, y * spacing + startOffset + firstYShift);
      ctx.lineTo(startOffset + quarter * 2 + secondXShift, y * spacing + startOffset + secondYShift);
      ctx.lineTo(startOffset + quarter * 3 + thirdXShift, y * spacing + startOffset + thirdYShift);
      ctx.lineTo(canvas.width - startOffset, y * spacing + startOffset);
      ctx.stroke();
    }
  }

  var counter = 0;
  var hue1 = 0;
  var hue2 = 0;

  function step() {
    if (!animate) return;
    if (!isInViewport(canvas)) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    counter++;

    line(counter, 0.001, hue1);

    line(counter * 2, 0.0001, hue2);

    hue1 += 1;
    hue2 += 0.1;

    window.requestAnimationFrame(step);
  }

  window.requestAnimationFrame(step);
};

window.addEventListener('resize', function () {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  stop();
  start();
});

start();
