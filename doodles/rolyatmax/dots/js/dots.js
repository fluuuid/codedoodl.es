
///// Dots

(function(){

	///// Dot Class

    var Dot = function( x, y ) {
        this.id = 'd-x' + x + 'y' + y;
        this.x = x;
        this.y = y;
    };

    Dot.prototype = {
        draw: function(ctx) {
            var coords = this.coords();

            ctx.fillStyle = DOTS.LIGHT_GRAY;
            ctx.fillRect( coords.x, coords.y, DOTS.DOT_SIZE, DOTS.DOT_SIZE );
            return this;
        },
        coords: function() {
            return {
                x: this.x * DOTS.BOX_SIZE,
                y: this.y * DOTS.BOX_SIZE
            };
        }
    };




    ///// Dots Collection

    var dots = (function(){

        var _dots = {};
        var _dots_array = [];

        function create( x, y ) {
            add( new Dot( x, y ) );
        }

        function add( dot ) {
            if (!dot) { return; }
            if (typeof dot.x !== 'number' || typeof dot.y !== 'number') { return; }

            var x = 'x' + dot.x;
            var y = 'y' + dot.y;

            _dots[x] = _dots[x] || {};
            _dots[x][y] = dot;

            _dots_array.push(dot);
        }

        function get( x, y ) {

            if (typeof x !== 'number' || typeof y !== 'number') {
                return _dots_array;
            }

            x = 'x' + x;
            y = 'y' + y;

            return _dots[x] && _dots[x][y];
        }

        // returns two neighbors (the neighbor below and to the right)
        function getNeighborsOf(dot) {
            var neighbors = [];
            neighbors.push( get(dot.x + 1, dot.y) );
            neighbors.push( get(dot.x, dot.y + 1) );
            return neighbors;
        }

        // returns all four neighbors)
        function getAllNeighborsOf(dot) {
            if (dot.neighbors) return dot.neighbors;

            var neighbors = [];
            neighbors.push( get(dot.x + 1, dot.y) );
            neighbors.push( get(dot.x, dot.y + 1) );
            neighbors.push( get(dot.x - 1, dot.y) );
            neighbors.push( get(dot.x, dot.y - 1) );

            dot.neighbors = neighbors;
            return neighbors;
        }

        // with 'dot' as the upper LH corner, get the next 3 dots that make up the box
        function getFourCorners(dot) {
            if (dot.corners) return dot.corners;

            var corners = [
                dot,
                get( dot.x + 1, dot.y ),
                get( dot.x + 1, dot.y + 1 ),
                get( dot.x, dot.y + 1)
            ];
            dot.corners = _.compact(corners);
            return dot.corners;
        }

        function reset() {
            _dots = {};
            _dots_array = [];
        }

        return {
            get: get,
            getNeighborsOf: getNeighborsOf,
            getAllNeighborsOf: getAllNeighborsOf,
            getFourCorners: getFourCorners,
            reset: reset,
            create: create
        };
    })();


    ///// Exports
    window.dots = dots;

})();
