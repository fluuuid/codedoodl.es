
/* global minsize, maxsize, mouseY, yellow, orange, white, mouseX, maxspeed, maxforce, addons, removals, width, height */

var Boxed = function (x_, y_, opt_size) {
    this.pos = new Vect2d(x_, y_);
    this.vel = new Vect2d(0, 0);
    this.acc = new Vect2d(0, 0);
    this.size = opt_size || random(minsize, maxsize);
    this.value = null;
    this.name = "";
    this.mouseover = false;
    this.pressed = false;
    this.dragged = false;
    this.immortal = false;
    this.mutable = true;
    this.icon = null;
    this.link = "";

    Boxed.prototype.setMutable = function (flag) {
        this.mutable = flag;
    };

    Boxed.prototype.isMutable = function () {
        return this.mutable;
    };

    Boxed.prototype.isMouseOver = function () {
        return this.mouseover;
    };

    Boxed.prototype.isPressed = function () {
        return this.pressed;
    };

    Boxed.prototype.isDragged = function () {
        return this.dragged;
    };

    Boxed.prototype.setPressed = function (flag) {
        this.pressed = flag;
    };

    Boxed.prototype.setDragged = function (flag) {
        this.dragged = flag;
    };

    Boxed.prototype.setLink = function (link) {
        this.link = link;
        return this;
    };

    Boxed.prototype.setIcon = function (icon) {
        this.icon = icon;
        return this;
    };

    Boxed.prototype.getValue = function () {
        return this.value;
    };

    Boxed.prototype.setValue = function (val) {
        this.value = val;
        if (this.value !== null)
            this.mutable = false;
        else
            this.mutable = true;
        return this;
    };

    Boxed.prototype.getName = function () {
        return this.name;
    };

    Boxed.prototype.setName = function (n) {
        this.name = n;
        return this;
    };

    Boxed.prototype.getSize = function () {
        return this.size;
    };

    Boxed.prototype.setSize = function (s) {
        this.size = s;
        return this;
    };

    Boxed.prototype.display = function () {
        this.mouseover = this.contains(mouseX, mouseY);
        if (this.mouseover)
            mouseoverboxed = this;
        fill(this.mouseover ? (this.pressed ? white : yellow) : orange);
        //ellipse(this.x(), this.y(), this.size, this.size);
        rect(this.x1(), this.y1(), this.size, this.size);

        if (this.value !== null) {
            image(this.value, this.x1() - 2, this.y1() - 2, this.size + 4, this.size + 4);
//            fill(orange); 
//            if(this.mouseover) text(this.name , this.x(), this.y2()+11);
        }

    };

    Boxed.prototype.setCenter = function (xx, yy) {
        this.pos.set(xx, yy);
    };

    Boxed.prototype.getPos = function () {
        return this.pos;
    };
    Boxed.prototype.x = function () {
        return this.pos.x;
    };

    Boxed.prototype.y = function () {
        return this.pos.y;
    };
    Boxed.prototype.width = function () {
        return this.size;
    };
    Boxed.prototype.height = function () {
        return this.size;
    };

    Boxed.prototype.intersects = function (x1, y1, x2, y2) {
        return !(this.x2() < x1 || x2 < this.x1() || this.y2() < y1 || y2 < this.y1());
    };

    Boxed.prototype.intersectsBoxed = function (other) {
        return !(this.x2() < other.x1() || other.x2() < this.x1() || this.y2() < other.y1() || other.y2() < this.y1());
    };
    Boxed.prototype.contains = function (xx, yy) {
        return xx >= this.x1() && yy >= this.y1() && xx <= this.x2() && yy <= this.y2();
    };

    Boxed.prototype.x1 = function () {
        return this.pos.x - this.size * 0.5;
    };

    Boxed.prototype.x2 = function () {
        return this.pos.x + this.size * 0.5;
    };

    Boxed.prototype.y1 = function () {
        return this.pos.y - this.size * 0.5;
    };

    Boxed.prototype.y2 = function () {
        return this.pos.y + this.size * 0.5;
    };

    Boxed.prototype.applyForce = function (force) {
        //console.log("applyforce");
        //this.acc.div(this.size);
        this.acc.add(force);
    };

    Boxed.prototype.update = function () {
        if (!this.pressed) {
            this.vel.add(this.acc);
            this.vel.limit(maxspeed);
            this.pos.add(this.vel);
            this.vel.scale(0.9999);
            this.acc.scale(0);
        }
    };

    Boxed.prototype.seek = function (vector) {
        this.applyForce(Vect2d.prototype.subtract(vector, this.pos)
                .setMag(maxspeed)
                .sub(this.vel)
                .limit(maxforce)
                );
    };

    Boxed.prototype.avoid = function (vector) {
        this.applyForce(
                Vect2d.prototype.subtract(this.pos, vector)
                .setMag(maxspeed)
                .sub(this.vel)
                .limit(maxforce));
    };

    Boxed.prototype.separate = function (movers) {
        var steer = new Vect2d();
        var count = 0;

        for (var i = 0; i < movers.length; i++) {
            var other = movers[i];
            var d = Vect2d.prototype.dist(this.pos, other.pos);
            var desiredsep = (this.size + other.size) * 0.5;
//            if (d === 0) {
//                steer.add(Vect2d.prototype.subtract(this.pos, movers[i].pos).setMag(desiredsep));
//                //count++;
//            }
            if (d > 0 && d < desiredsep) {
                this.immortal = true;
                if (!other.immortal)
                    other.onImpact();

                steer.add(Vect2d.prototype.subtract(this.pos, other.pos).setMag(1 / d));
                count++;
            }


        }
        if (count > 0) {
            //if(!other.immortal) other.onImpact();
            this.applyForce(steer.div(count).setMag(maxspeed).sub(this.vel).limit(maxforce * this.size));
        } else {
            this.immortal = false;
            // else -> it goes away using vel set already! hence it moves !
        }


    };

    Boxed.prototype.onImpact = function () {
        //console.log("onImpact()");
        if (this.mutable) {
            var n = this.size;

            if (n > minsize) {
                //console.log("this.size > 4");
                //var p = random(1);

                for (var i = 0; i < random(2, n * 0.5); i++) {
                    //console.log("forloop impact");
                    var bx = new Boxed(this.x() + random(1, -1), this.y() + random(1, -1), random(n * 0.5, n * 0.8));
                    bx.immortal = true;
                    addons[addons.length] = bx;
                }
            }
            //console.log("added");
            //removals[removals.length]= other;
            removals[removals.length] = this;
            //boxes.remove(this);
        }
    };

    Boxed.prototype.stayWithin = function (border) {
        if (this.x1() <= border.x1()) {
            this.applyForce(new Vect2d(maxspeed, this.vel.y).sub(this.vel).limit(maxforce));

        } else if (this.x2() >= border.x2()) {
            this.applyForce(new Vect2d(-maxspeed, this.vel.y).sub(this.vel).limit(maxforce));

        } else if (this.y1() <= border.y1()) {
            this.applyForce(new Vect2d(this.vel.x, maxspeed).sub(this.vel).limit(maxforce));

        } else if (this.y2() >= border.y2()) {
            this.applyForce(new Vect2d(this.vel.x, -maxspeed).sub(this.vel).limit(maxforce));

        }
    };
};


var EMPTY = 0;
var LEAF = 1;
var POINTER = 2;

var SingleQuad = function (x_, y_, w_, h_, opt_parent) {

    this.x = x_ || 0;
    this.y = y_ || 0;
    this.w = w_ || width;
    this.h = h_ || height;

    this.parent = opt_parent || null;
    this.nw;
    this.ne;
    this.sw;
    this.se;

    this.value = null;

    this.type = EMPTY;

    SingleQuad.prototype.size = function () {
        switch (this.type) {
            case EMPTY:
            case LEAF:
                return 1;
            case POINTER :
                var v = 0;
                v += this.nw.size();
                v += this.ne.size();
                v += this.sw.size();
                v += this.se.size();
                return v;
        }
    };
    SingleQuad.prototype.add = function (b) {

        if (!this.contains(b.x(), b.y())) {
            //console.log("quad.add() is not inside quad");
            return false;
        }
        switch (this.type) {
            case EMPTY:
                // console.log("quad.add() EMPTY -> put()");
                this.put(b);
                return true;

            case LEAF:
                this.subdivide();
            case POINTER:
                if (this.nw.contains(b.x(), b.y()))
                    return this.nw.add(b);
                else if (this.ne.contains(b.x(), b.y()))
                    return this.ne.add(b);
                else if (this.sw.contains(b.x(), b.y()))
                    return this.sw.add(b);
                else if (this.se.contains(b.x(), b.y()))
                    return this.se.add(b);
        }
    };

    SingleQuad.prototype.put = function (boxed) {
        this.value = boxed;
        this.type = LEAF;
    };

    SingleQuad.prototype.subdivide = function () {
        var halfw = this.w * 0.5,
                halfh = this.h * 0.5,
                x = this.x,
                y = this.y;

        this.nw = new SingleQuad(x, y, halfw, halfh, this);

        this.ne = new SingleQuad(x + halfw, y, halfw, halfh, this);

        this.sw = new SingleQuad(x, y + halfh, halfw, halfh, this);

        this.se = new SingleQuad(x + halfw, y + halfh, halfw, halfh, this);

        var b = this.value;
        this.value = null;
        this.type = POINTER;

        if (this.nw.contains(b.x(), b.y())) {
            this.nw.put(b);
        } else if (this.ne.contains(b.x(), b.y())) {
            this.ne.put(b);
        } else if (this.sw.contains(b.x(), b.y())) {
            this.sw.put(b);
        } else if (this.se.contains(b.x(), b.y())) {
            this.se.put(b);
        }
    };

    SingleQuad.prototype.remove = function (boxed) {

    };

    SingleQuad.prototype.balance = function () {

    };

    SingleQuad.prototype.resizeQuad = function (w_, h_) {
        this.w = w_;
        this.h = h_;
    };

    SingleQuad.prototype.clear = function () {
        this.value = null;
        this.nw = null;
        this.ne = null;
        this.sw = null;
        this.se = null;
        this.type = EMPTY;
        this.parent = null;
    };

    SingleQuad.prototype.display = function () {
        fill(0, 5);
        switch (this.type) {
            case POINTER:
                this.nw.display();
                this.ne.display();
                this.sw.display();
                this.se.display();
            case LEAF:
            case EMPTY:
                rect(this.x, this.y, this.w, this.h);

        }
    };

    SingleQuad.prototype.traverse = function (f) {
        if (this.type === POINTER) {
            if (this.nw !== null)
                this.nw.traverse(f);
            if (this.ne !== null)
                this.ne.traverse(f);
            if (this.sw !== null)
                this.sw.traverse(f);
            if (this.se !== null)
                this.se.traverse(f);
        } else {
            f(this);
        }
    };

    SingleQuad.prototype.getObjectAt = function (xx, yy) {
        //        return this.getQuadAt(xx,yy).getValue(); // wrong
        switch (type) {
            case POINTER:
            {
                if (this.nw.getObjectAt(x_, y_) !== null)
                    return nw.getObjectAt(x_, y_);
                if (this.ne.getObjectAt(x_, y_) !== null)
                    return ne.getObjectAt(x_, y_);
                if (this.sw.getObjectAt(x_, y_) !== null)
                    return sw.getObjectAt(x_, y_);
                if (this.se.getObjectAt(x_, y_) !== null)
                    return se.getObjectAt(x_, y_);
            }
            case LEAF:
            {

                if (this.value !== null && this.value.getBox().contains(x_, y_)) {
                    return this.value;
                }

                return null;
            }

            default:
                return null;

        }
    };

    SingleQuad.prototype.getQuadAt = function (xx, yy) {
        if (this.contains(xx, yy)) {
            if (this.type === LEAF) {
                return this;
            } else if (this.type === POINTER) {
                if (this.nw.contains(xx, yy))
                    return this.nw.getQuadAt(xx, yy);
                if (this.ne.contains(xx, yy))
                    return this.ne.getQuadAt(xx, yy);
                if (this.sw.contains(xx, yy))
                    return this.sw.getQuadAt(xx, yy);
                if (this.se.contains(xx, yy))
                    return this.se.getQuadAt(xx, yy);
            }
        }
    };

    SingleQuad.prototype.getObjectsUnder = function (box) {
        var toUse = [];
        return this.getObjectsUnderInternal(toUse, box);
    };

    SingleQuad.prototype.getObjectsUnderInternal = function (toUse, box) {
        if (this.intersectsBoxed(box)) {
            if (this.type === LEAF) {
                toUse[toUse.length] = this.value;
            } else if (this.type === POINTER) {
                this.nw.getObjectsUnderInternal(toUse, box);
                this.ne.getObjectsUnderInternal(toUse, box);
                this.sw.getObjectsUnderInternal(toUse, box);
                this.se.getObjectsUnderInternal(toUse, box);
            }
        }
        return toUse;
    };

    SingleQuad.prototype.getQuadsUnder = function (box) {
        var toUse = [];
        return this.getQuadsUnderInternal(toUse, box);
    };

    SingleQuad.prototype.getQuadsUnderInternal = function (toUse, box) {
        if (this.intersectsBoxed(box)) {
            if (this.type === LEAF) {
                toUse[toUse.length] = this;
            } else if (this.type === POINTER) {
                this.nw.getQuadsUnderInternal(toUse, box);
                this.ne.getQuadsUnderInternal(toUse, box);
                this.sw.getQuadsUnderInternal(toUse, box);
                this.se.getQuadsUnderInternal(toUse, box);
            }
        }
        return toUse;
    };

    SingleQuad.prototype.getRoot = function () {
        return this.parent === null ? this : this.parent.getRoot();
    };

    SingleQuad.prototype.getValue = function () {
        return this.value;
    };

    SingleQuad.prototype.getType = function () {
        return this.type;
    };

    SingleQuad.prototype.getParent = function () {
        return this.parent;
    };

    SingleQuad.prototype.xcenter = function () {
        return this.x + this.w * 0.5;
    };

    SingleQuad.prototype.ycenter = function () {
        return this.y + this.h * 0.5;
    };

    SingleQuad.prototype.width = function () {
        return this.w;
    };

    SingleQuad.prototype.height = function () {
        return this.h;
    };

    SingleQuad.prototype.x1 = function () {
        return this.x;
    };

    SingleQuad.prototype.y1 = function () {
        return this.y;
    };

    SingleQuad.prototype.x2 = function () {
        return this.x + this.w;
    };

    SingleQuad.prototype.y2 = function () {
        return this.y + this.h;
    };

    SingleQuad.prototype.contains = function (xx, yy) {
        return xx >= this.x1() && yy >= this.y1() && xx <= this.x2() && yy <= this.y2();
    };

    SingleQuad.prototype.containsBoxed = function (boxed) {
        return boxed.x1() >= this.x1() && boxed.y1() >= this.y1() && boxed.x2() <= this.x2() && boxed.y2() <= this.y2();
    };

    SingleQuad.prototype.intersects = function (x1, y1, x2, y2) {
        return !(this.x2() < x1 || x2 < this.x1() || this.y2() < y1 || y2 < this.y1());
    };

    SingleQuad.prototype.intersectsBoxed = function (boxed) {
        return !(this.x2() < boxed.x1() || boxed.x2() < this.x1() || this.y2() < boxed.y1() || boxed.y2() < this.y1());
    };
};


var Vect2d = function (x, y) {
    this.x = x || 0;
    this.y = y || 0;


    Vect2d.prototype.set = function (x_, y_) {
        this.x = x_;
        this.y = y_;
        return this;
    };

    Vect2d.prototype.add = function (v) {
        this.x += v.x;
        this.y += v.y;
        return this;
    };

    Vect2d.prototype.sub = function (v) {
        this.x -= v.x;
        this.y -= v.y;
        return this;
    };

    Vect2d.prototype.subtract = function (v1, v2) {
        return new Vect2d(v1.x - v2.x, v1.y - v2.y);
    };

    Vect2d.prototype.dist = function (v1, v2) {
        var dx = v1.x - v2.x;
        var dy = v1.y - v2.y;
        return Math.sqrt(dx * dx + dy * dy);
    };

    Vect2d.prototype.distSq = function (v1, v2) {
        var dx = v1.x - v2.x;
        var dy = v1.y - v2.y;
        return dx * dx + dy * dy;
    };

    Vect2d.prototype.mult = function (v) {
        this.x *= v.x;
        this.y *= v.y;
        return this;
    };

    Vect2d.prototype.scale = function (num) {
        this.x *= num;
        this.y *= num;
        return this;
    };

    Vect2d.prototype.div = function (num) {
        this.x /= num;
        this.y /= num;
        return this;
    };

    Vect2d.prototype.normalize = function () {
        var m = this.mag();
        if (m > 1)
            this.div(m);
        return this;
    };

    Vect2d.prototype.setMag = function (len) {
        this.normalize();
        this.scale(len);
        return this;
    };

    Vect2d.prototype.mag = function () {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    };

    Vect2d.prototype.magSq = function () {
        return this.x * this.x + this.y * this.y;
    };

    Vect2d.prototype.theta = function () {
        return atan2(y, x);
    };

    Vect2d.prototype.limit = function (max) {
        if (this.magSq() > max * max) {
            this.normalize();
            this.scale(max);
        }
        return this;
    };
};
