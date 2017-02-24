
///// Drawers

(function(){

	///// Drawers Collection

    var drawers = (function(){

        var _drawers = [];
        var _lines = [];
        var _alive = [];

        function create( x, y ) {
            // if x and y are coords, then get the dot from the collection
            // otherwise, assume that x is a dot
            var dot = (typeof x === 'number' && typeof y === 'number') ? dots.get(x, y) : x;

            var drawer = new Drawer( dot );
            _drawers.push( drawer );
            addToAlive( drawer );

        }

        // check to see if the line passed in is already in the lines array
        function checkLines(line) {
            if (!line || !line.id) return false;
            for (var i = 0, len = _lines.length; i < len; i++) {
                if (line.id === _lines[i].id) return true;
            }
            return false;
        }

        function get() {
            return _drawers;
        }

        function removeDrawer( drawer ) {
            var i = _.indexOf(_drawers, drawer);
            _drawers.splice( i, 1);
        }

        function addToAlive( drawer ) {
            _alive.push( drawer );
        }

        function removeFromAlive( drawer ) {
            var i = _.indexOf(_alive, drawer);
            _alive.splice( i, 1);
        }

        function getAlive() {
            return _alive;
        }

        function reset() {
            _drawers = [];
            _lines = [];
        }

        ///// Animator Class for helping to animate the lines

        var Animator = function(dot1, dot2, line, drawer) {
            this.drawer = drawer;
            this.line = line;
            this.destDot = dot2;
            this.next = dot1.coords();
            this.coords2 = dot2.coords();
            this.cur = {};
            this.complete = false;
        };

        Animator.prototype = {
            update: function() {
                if (this.complete) return;

                this.cur = {
                    x: this.next.x,
                    y: this.next.y
                };

                var dx = (this.coords2.x - this.cur.x) * DOTS.DRAW_SPEED;
                var dy = (this.coords2.y - this.cur.y) * DOTS.DRAW_SPEED;

                if (abs(dx) < 0.05 && abs(dy) < 0.05) {
                    this.next = this.coords2;
                    this.draw(DOTS);
                    this.drawer.completedAnimation();
                    return;
                }

                this.next = {
                    x: this.cur.x + dx,
                    y: this.cur.y + dy
                };

                this.draw(DOTS);
            },

            draw: function(ctx) {

                ctx.strokeStyle = DOTS.LINE_COLOR;
                ctx.beginPath();
                ctx.moveTo(this.cur.x, this.cur.y);
                ctx.lineTo(this.next.x, this.next.y);
                ctx.stroke();

            }
        };


        ///// Drawer Class

        var Drawer = function( startingDot ) {
            this.location = startingDot;
            this.dead = false;
            this.animating = false;
            this.id = _.uniqueId();
        };

        Drawer.prototype = {
            drawToNeighbor: function() {
                if (this.dead) return;

                if (this.animator) {
                    this.animator.update();
                    return;
                }

                var current = this.location;

                var neighbors = dots.getAllNeighborsOf(current);

                var someLines = _.map(neighbors, function(dot){
                    if (!dot) return false;
                    var line = lines.get(dot, current);
                    if (!line) return false;
                    if (checkLines(line)) return false;
                    return line;
                });

                someLines = _.compact(someLines);

                if (!someLines.length) {
                    return this.remove();
                }

                var i = random(someLines.length) | 0;
                var line = someLines[i];

                _lines.push(line);

                var destDot = (line.dot1 === this.location) ? line.dot2 : line.dot1;
                this.animator = new Animator(this.location, destDot, line, this);

            },
            completedAnimation: function() {
                this.location = this.animator.destDot;
                this.animator.line.drawn = true;
                this.animator.line.alertBoxes();
                this.animator = null;
            },
            remove: function() {
                removeFromAlive( this );

                this.dead = true;
                // removeDrawer(this);
            }
        };

        return {
            create: create,
            get: get,
            reset: reset,
            getAlive: getAlive,
            removeFromAlive: removeFromAlive,
            addToAlive: addToAlive
        };
    })();


    ///// Exports
    window.drawers = drawers;

})();