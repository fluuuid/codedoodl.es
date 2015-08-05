///// Lines

(function(){

    ///// Line Class

    var Line = function( dot1, dot2 ) {
        this.id = _.uniqueId('l');
        this.dot1 = dot1;
        this.dot2 = dot2;
        this.boxes = [];
        this.drawn = false;
    };

    Line.prototype = {
        draw: function(ctx) {
            var coords1 = this.dot1.coords();
            var coords2 = this.dot2.coords();

            ctx.strokeStyle = DOTS.LINE_COLOR;
            ctx.beginPath();
            ctx.moveTo(coords1.x, coords1.y);
            ctx.lineTo(coords2.x, coords2.y);
            ctx.stroke();

            this.drawn = true;
        },

        setPointerToBox: function(box) {
            this.boxes.push(box);
        },

        alertBoxes: function() {
            var len = this.boxes.length;
            while (len--) {
                this.boxes[len].lineDrawn();
            }
        }
    };




    ///// Lines Collection

    var lines = (function(){

        var _lines = {};
        var _lines_array = [];

        function add( line ) {
            var dot1 = line.dot1;
            var dot2 = line.dot2;

            if (!dot1 || !dot2) { return; }

            _lines[dot1.id] = _lines[dot1.id] || {};
            _lines[dot1.id][dot2.id] = line;

            _lines_array.push(line);
        }

        function create( dot1, dot2 ) {
			add( new Line( dot1, dot2 ) );
        }

        // doesn't matter what order dot1 and dot2 are passed in
        function get( dot1, dot2 ) {

            if (!dot1 || !dot2) {
                return _lines_array;
            }

            if (_lines[dot1.id] && _lines[dot1.id][dot2.id]) {
                return _lines[dot1.id][dot2.id];
            } else {
                return _lines[dot2.id] && _lines[dot2.id][dot1.id];
            }

        }

        function reset() {
            _lines = {};
            _lines_array = [];
        }

        return {
            create: create,
            get: get,
            reset: reset
        };
    })();


    ///// Exports
    window.lines = lines;

})();
