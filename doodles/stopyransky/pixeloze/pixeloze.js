
/* global width, height, mouseY, mouseX, Vect2d, CENTER */

var root = {};
var boxes = [];
var addons = [];
var removals = [];
var maxspeed = 20;
var maxforce = 0.95;
var minsize = 5;
var maxsize = 24;
var mouseBox = {};
var active = null;
var mouseDragging = false;
var mouseoverboxed = null;
var power = 0;
var showLegend = true;
var orange;
var yellow;
var white;
var txtSize = 10;

function setup() {
    createCanvas(window.innerWidth, window.innerHeight);
    smooth();
    frameRate(25);
    noStroke();
    smooth();
    
    orange = color(255, 89,0,255);
    
    yellow = color(255,189,0,255);
    
    white = color(255,255,255);
    
    root = new SingleQuad(0, 0, width, height, null);
    
    mouseBox = new Boxed(width/2, height/2);
    
    mouseBox.setSize(1);
    
    for(var i = 0; i < 20; i++) {
        var b = new Boxed(random(width), random(height));
        boxes[boxes.length] = b;
    }
}

function reset() {

    root.clear();
    mouseoverboxed = null;
    
    // removing objects that had impact
    for(var i = 0; i < removals.length; i++) {
        var b = removals[i];
        var index = boxes.indexOf(b);
        boxes.splice(index, 1);
    }
    removals = [];
    
    // adding the objects created on impact
    var temp = boxes.concat(addons);
    addons = [];
    boxes = temp;
    
    for(var i = 0; i < boxes.length ; i++) {
        if(boxes.length < 20) {
            var b = new Boxed(random(width), random(height), random(minsize, maxsize));
            b.applyForce(new Vect2d(random(-1,1), random(-1,1)));
            boxes[boxes.length] = b;
        }
        
        if(root.add(boxes[i])) {} else {
            removals[removals.length] = boxes[i];
        }     
    }
}

function update() {
    reset();
    root.traverse(applyBehaviors);
    root.traverse(updateMotion);   
}

function draw() {
    
    update();
    
    background(255);

    noStroke();
    
    root.display();

    noFill();

    root.traverse(displayHoverQuads);

    root.traverse(displayContent);
    
    if(mouseDragging && active !== null && active.isMutable()) {
        stroke(255, 89,0,155);
        var m = new Vect2d(active.x(), active.y()).sub(new Vect2d(mouseX, mouseY));
        line(active.x(), active.y(), active.x() + m.x, active.y() + m.y);
        stroke(255);
        line(active.x(), active.y(), mouseX, mouseY);
        strokeWeight(5);
        point(active.x(), active.y());
        point(mouseX, mouseY);
        strokeWeight(1);
        noStroke();
    }
}

function mouseMoved() {
    mouseBox.setCenter(mouseX, mouseY);
}

function mousePressed() {
    root.traverse(passMousePress);
}

function mouseReleased() {
    if(active === null) {
        var boxed = new Boxed(mouseX+random(-1,1), mouseY+random(-1,1), random(8,20));
        boxes[boxes.length] = boxed;
        active = boxed;
    }
    root.traverse(passMouseRelease);
    mouseDragging = false;
}

function mouseDragged() {
    mouseMoved();
    if(active !== null && active.isMutable()) active.setDragged(true);
    mouseDragging = true;
};

function mouseEntered() {
    mouseMoved();
}

function mouseExited() {
    mouseMoved();
}

function mouseWheel(e) {
    var scrollamt = e.detail ? e.detail * (-120) : e.wheelDelta;
    var delta = scrollamt > 0 ? 1 : scrollamt < 0 ? -1 : 0;
    if(active !== null) {
        var s = active.getSize() +delta;
        active.setSize(s);
    }
    
}

function windowResized() {
    resizeCanvas(window.innerWidth, window.innerHeight);
    root.resizeQuad(window.innerWidth-1, window.innerHeight-1);
    root.clear();
    for(var i = 0; i < boxes.length ; i++) {
        root.add(boxes[i]);
    }   
}

var passMousePress = function(quad) {
    var b = quad.getValue();
    if(b !== null && b.isMouseOver()) {
        b.setPressed(true);  
        active = b;
    }
};

var passMouseRelease = function(quad) {
    var b = quad.getValue();
    
    if(b !== null) {
        if(b.isPressed()) {
            if(!mouseDragging && b.link !== "") {
                window.open(b.link, "_blank");
            }
            b.setPressed(false);
        }
        if(b.isDragged()) {
            b.setDragged(false);
            if(b.isMutable) {
                var f = Vect2d.prototype.subtract(new Vect2d(b.x(), b.y()), new Vect2d(mouseX, mouseY));
                b.applyForce(f);
            }
        }
        active = null;
    }
};

var displayHoverQuads = function(quad) {
    if(quad.intersectsBoxed(mouseBox)) {
        fill(0,20);
        rect(quad.x1(), quad.y1(), quad.width(), quad.height());
    }
};

var displayContent = function(quad) {
    if(quad.getValue() !== null) {
            quad.getValue().display();
    }
    
};

var updateMotion = function(quad) {
    if(quad.getValue() !== null) {
            quad.getValue().update();
    }
};

var applyBehaviors = function(quad) {
    var val = quad.getValue();
    if(val !== null) {
            if(!val.isMutable()) val.stayWithin(root);
            val.separate(root.getObjectsUnder(val));
    }
};