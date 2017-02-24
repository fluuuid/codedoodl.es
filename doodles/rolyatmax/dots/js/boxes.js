
///// Boxes

(function(){

	///// Color Class for helping with fade animation

    var Color = function( opts ) {
        opts = opts || {};
        this.r = opts.r;
        this.g = opts.g;
        this.b = opts.b;
        this.a = opts.a;
        this.box = opts.box;
        this.cur_alpha = 0;
    };

    Color.prototype = {
        toRGBA: function() {
            var levels = [ this.r, this.g, this.b, this.cur_alpha ];
            return 'rgba(' + levels.join(',') + ')';
        },

        fadeInStep: function() {
            var da = (this.a - this.cur_alpha) * DOTS.FADE_SPEED;
            this.cur_alpha += da;
            if (da < 0.00001) {
                this.cur_alpha = this.a;
                if (this.box) this.box.fadeComplete();
            }
            return this;
        }
    };


    ///// Box Class

    var Box = function( dot1, dot2, dot3, dot4 ) {
        this.id = _.uniqueId('b');
        this.dots = [];
        this.fading = false;

        this.lines = [
            lines.get(dot1, dot2),
            lines.get(dot2, dot3),
            lines.get(dot3, dot4),
            lines.get(dot4, dot1)
        ];

        this.lines = _.compact(this.lines);
        if (this.lines.length !== 4) {
            return;
        }

        // set pointers on the lines back to this box
        // and setup the dots array
        for (var i = 0, len = this.lines.length; i < len; i++) {
            this.lines[i].setPointerToBox(this);
            this.dots.push(this.lines[i].dot1);
            this.dots.push(this.lines[i].dot2);
        }

        this.dots = _.uniq(this.dots);
    };

    Box.prototype = {
        // returns the upper LH dot of the box
        getOriginDot: function() {
            var originDot;
            var len = this.dots.length;
            while (len--) {
                var dot = this.dots[len];
                originDot = originDot || dot;
                if (dot.x < originDot.x || dot.y < originDot.y) {
                    originDot = dot;
                }
            }
            this.originDot = originDot;
            return originDot;
        },

        checkDrawnLines: function() {
            var len = this.lines.length;
            while (len--) {
                if (!this.lines[len].drawn) { return false; }
            }
            return true;
        },

        fill: function(ctx) {
            /// get the upper LH dot
            var dot = this.originDot || this.getOriginDot();
            var coords = dot.coords();
            var offset = DOTS.FILLED_BOX_OFFSET;
            var dimen = DOTS.BOX_SIZE - (offset * 2);
            ctx.beginPath();
            ctx.rect(coords.x + offset, coords.y + offset, dimen, dimen);
            ctx.fillStyle = 'white';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.5)';
            ctx.stroke();
            ctx.closePath();

            ctx.beginPath();
            ctx.rect(coords.x, coords.y, DOTS.BOX_SIZE, DOTS.BOX_SIZE);
            ctx.fillStyle = this.color.fadeInStep().toRGBA();
            ctx.fill();
        },

        lineDrawn: function() {
            if (this.checkDrawnLines()) {
                this.startFade();
            }
        },

        startFade: function() {
            var color_data = random(DOTS.FILL_COLORS);
            color_data.box = this;
            this.color = new Color( color_data );
            this.fading = true;
            boxes.addToFading(this);
        },

        fadeComplete: function() {
            this.fading = false;
            boxes.removeFromFading(this);
        }
    };



    ///// Boxes Collection

    var boxes = (function(){

        var _boxes = [];
        var _fading_boxes = [];

        function create( cornerDots ) {
            add(new Box( cornerDots[0], cornerDots[1], cornerDots[2], cornerDots[3] ) );
        }

        function add( box ) {
            if (!box) { return; }

            _boxes.push(box);
        }

        function get() {
            return _boxes;
        }

        function getFading() {
            return _fading_boxes;
        }

        function removeFromFading(box) {
            var i = _.indexOf(_fading_boxes, box);
            _fading_boxes.splice( i, 1);
        }

        function addToFading(box) {
            _fading_boxes.push(box);
        }

        function reset() {
            _boxes = [];
            _fading_boxes = [];
        }

        return {
            create: create,
            get: get,
            reset: reset,
            getFading: getFading,
            removeFromFading: removeFromFading,
            addToFading: addToFading
        };
    })();


    ///// Exports
    window.boxes = boxes;

})();