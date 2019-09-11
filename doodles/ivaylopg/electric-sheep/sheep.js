!function(){

  /* TO Do:
   * - Add wind + rain?
   * - tune maxGlobalAlpha per color and shape
  */

  var stats, debug = false;

  var scene, camera, renderer;
  var cloud, cloudGeo, cloudMesh, cloudPoints = [], cloudTex = [];
  var maxChildren = 7, numReps = 16, maxRadius = getCloudSize();//Math.min(getCloudSize(),200);
  var fadeCount = 0, fadeCountTrigger = randomR(1200,1800), globalAlpha = 0.0, fadeSpeed = 1/240, fadeDir = 1, maxGlobalAlpha = 0.8;
  var mouse = new THREE.Vector2(0,window.innerHeight);
  var interactive = true, sizeHist = [], touchRange = (maxRadius/10) * (maxRadius/10), growBackRate = 0.007;
  var colorStep = 0, colorSpeed = 120, destColor, currentColor = new THREE.Color(0xeeeeee);

  var showInfoIcon = true;

  var colors = [
    //new THREE.Color(0xa8ebfb),
    new THREE.Color(0x00b1d7),
    new THREE.Color(0xe09400),
    new THREE.Color(0xa259b5),
    new THREE.Color(0x1a1a58)];
  var skyBg = document.getElementById("container");
  skyBg.style.background = "#" + currentColor.getHexString();
  //console.log(colors[0].getHexString());
  //console.log(skyBg.currentStyle['background'])
  //console.log(document.defaultView.getComputedStyle(skyBg,null).getPropertyValue('background-color'))

  if (debug) {
    stats = new Stats();
    document.getElementById("container").appendChild( stats.dom );

    console.log(window.innerWidth + " x " + window.innerHeight)
    console.log(maxRadius);
  } else {
    console.log("Hello! Take a look at more work at http://ivaylogetov.com");
  }

  var input = QueryString();

  if (input.showInfo === "true") {
    document.getElementById("infoIcon").style.visibility = "visible";
  }

  // // Set up css transition callback:
  // var transitionEvent = whichTransitionEvent();
  // document.getElementById("theCanvas").addEventListener(transitionEvent, finishedFading);

  // Set up the mouse listener:
  if (interactive) {
    document.addEventListener( 'mousemove', onDocumentMouseMove, false );
  }

  initRenderer();
  initCloud();
  startLerp(colors[Math.floor(Math.random() * colors.length)],300);
  animate();

  ///////////////////////////

  function initRenderer() {
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera( -window.innerWidth/2, window.innerWidth/2, window.innerHeight/2, -window.innerHeight/2, 1, 1000 );
    camera.position.z = 1;
    var theCanvas = document.getElementById("theCanvas");
    renderer = new THREE.WebGLRenderer({ canvas: theCanvas, alpha: true });
    renderer.setSize( window.innerWidth, window.innerHeight );
  }

  function initCloud() {

    // Droplet shapes:
    var dropletShapes = [];
    var dSize = 256;
    var dCenter = dSize/2;

    //////// Circle
    var dCircle = document.createElement('canvas');
    var dCircleContext = dCircle.getContext('2d');
    dCircle.width = dSize;
    dCircle.height = dSize;
    //dCircleContext.clearRect(0,0,dSize,dSize);
    dCircleContext.beginPath();
    dCircleContext.arc(dCenter, dCenter, dCenter*.94, 0, 2 * Math.PI, false);
    dCircleContext.fillStyle = "rgba(255, 255, 255, 0.15)";
    dCircleContext.fill();
    dCircleContext.closePath();
    dropletShapes.push(dCircle)

    //////// Square
    var dSquare = document.createElement('canvas');
    var dSquareContext = dSquare.getContext('2d');
    dSquare.width = dSize;
    dSquare.height = dSize;
    dSquareContext.rotate(-0.17);
    dSquareContext.fillStyle = "rgba(255, 255, 255, 0.1)";
    dSquareContext.fillRect(0.2,dSize*0.2,dSize*0.8,dSize*0.8);
    dSquareContext.fillStyle = "rgba(255, 255, 255, 0.2)";
    var thick = dSize/10
    dSquareContext.fillRect(0,dSize-thick,dSize*0.8,thick);
    dropletShapes.push(dSquare)

    //////// Triangle
    var dTriangle = document.createElement('canvas');
    var dTriangleContext = dTriangle.getContext('2d');
    dTriangle.width = dSize;
    dTriangle.height = dSize;
    dTriangleContext.rotate(-0.17);
    dTriangleContext.fillStyle = "rgba(255, 255, 255, 0.1)";
    dTriangleContext.beginPath();
    dTriangleContext.moveTo(dCenter,dSize*0.25);         // dTriangleContext.moveTo(dCenter,dSize*0.75);
    dTriangleContext.lineTo(dSize * .9,dSize * .9);      // dTriangleContext.lineTo(dSize,0);
    dTriangleContext.lineTo(0,dSize * .9);               // dTriangleContext.lineTo(0,0);
    dTriangleContext.fill();
    var thick = dSize/20
    dTriangleContext.fillRect(0,dSize-thick,dSize,thick);
    dropletShapes.push(dTriangle)

    //////// hexagon
    var dHexagon = document.createElement('canvas');
    var dhexagonContext = dHexagon.getContext('2d');
    dHexagon.width = dSize;
    dHexagon.height = dSize;
    var dMargin = dSize * 0.1;
    var dBoundingBox = dSize - (2 * dMargin);
    var dSide = dBoundingBox * 0.577350273;
    dhexagonContext.rotate(-0.17);
    dhexagonContext.fillStyle = "rgba(255, 255, 255, 0.1)";
    dhexagonContext.beginPath();
    dhexagonContext.moveTo(-dMargin + 10 + (dBoundingBox-dSide)/2, dMargin);
    dhexagonContext.lineTo(-dMargin + 10 + (dBoundingBox-dSide)/2 + dSide, dMargin);
    dhexagonContext.lineTo(-dMargin + 10 + dBoundingBox,dBoundingBox/2 + dMargin);
    dhexagonContext.lineTo(-dMargin + 10 + (dBoundingBox-dSide)/2 + dSide, dBoundingBox + dMargin);
    dhexagonContext.lineTo(-dMargin + 10 + (dBoundingBox-dSide)/2, dBoundingBox + dMargin);
    dhexagonContext.lineTo(-dMargin + 10, dBoundingBox/2 + dMargin);
    dhexagonContext.fill();
    dropletShapes.push(dHexagon)

    //document.body.appendChild(dCircle);

    dropletShapes.forEach(function(ds){
      cloudTex.push(new THREE.Texture(ds))
      cloudTex[cloudTex.length - 1].needsUpdate = true;
    });

    // var startingShape = Math.floor(Math.random() * cloudTex.length)
    // //don't start with square shape:
    // if (startingShape === 1) {startingShape = 2}

    var uniforms = {
      tex: { type: "t", value: cloudTex[0] },
      globalAlpha: { type: "f", value: globalAlpha }
      //maxAlpha: { type: "f", value: maxGlobalAlpha }
    };

    var cloudShaderMat = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: document.getElementById('vertexShader').textContent,
      fragmentShader: document.getElementById('fragmentShader').textContent,
      // blending: THREE.CustomBlending,
      // blendEquation: THREE.AddEquation,
      // blendSrc: THREE.SrcAlphaFactor,
      // blendDst: THREE.OneMinusSrcAlphaFactor,
      transparent: true
    });

    // Create the recursive cloud-generator:
    var cloudPos = new THREE.Vector2(0,-window.innerHeight/10);
    cloud = new Cloud(numReps,cloudPos,1);
    cloud.setDrift(new THREE.Vector2(0.0,0.03));
    cloud.update();

    // Create the cloud mesh from the Cloud object:
    cloudGeo = new THREE.Geometry();
    cloudPoints.forEach(function(pt){
      cloudGeo.vertices.push(pt);
      if (interactive) {
        sizeHist.push(pt.z);
      }
    });
    cloudMesh = new THREE.Points(cloudGeo, cloudShaderMat);
    scene.add(cloudMesh);
    cloudMesh.geometry.dynamic = true;

    //changeDroplet();
    //console.log(cloudGeo.vertices.length);
  }

  function animate() {
    lerpBg();
    if (interactive) {
      cloud.setMoveTarget(mouse);
    }
    cloud.update();
    updateCloudShape();

    fadeCount++;
    if (fadeCount > fadeCountTrigger) {
      fadeCount = 0;
      fadeCountTrigger = randomR(2800,3800);
      fadeDir = 0;
    }

    if (fadeDir == 0) {
      if (globalAlpha > 0.0) {
        globalAlpha -= fadeSpeed
      } else {
        finishedFading();
      }
    } else if (fadeDir == 1 && globalAlpha < maxGlobalAlpha) {
      globalAlpha += fadeSpeed;
    }

    cloudMesh.material.uniforms.globalAlpha.value = globalAlpha;

    renderer.render(scene, camera);
    if (debug) {
      stats.update();
    }
    requestAnimationFrame(animate);
  }

  function updateCloudShape() {
    var bottomLine = cloudPoints[0].y - (0.7 * maxRadius);
    cloudPoints.forEach(function (pt,i){
      if (cloud.getFlat() && (pt.y - pt.z) < bottomLine) {
        pt.y = bottomLine + pt.z;
        pt.x *= 1.2;
      }

      if (interactive) {
        var rangeSq = new THREE.Vector2(0,0).subVectors(mouse,new THREE.Vector2(pt.x,pt.y)).lengthSq();
        if (rangeSq < touchRange) {
          sizeHist[i] = map(rangeSq/touchRange, 0, 1, 0, 0.95);
        }

        if (sizeHist[i] < 1.0) {
          pt.z *= sizeHist[i];

          sizeHist[i]+=growBackRate;
          if (sizeHist[i] > 1.0) {
            sizeHist[i] = 1.0;
          }
        }
      }

      cloudMesh.geometry.vertices[i] = pt;
    });
    // Don't draw the central (very large) droplet:
    cloudMesh.geometry.vertices[0].z = 0;

    cloudMesh.geometry.verticesNeedUpdate = true;
  }

  function makeNewCloud() {
    if (Math.random() < 0.75) {
      changeDroplet();
      startLerp(colors[Math.floor(Math.random() * colors.length)],300);
    }

    var cloudPos = new THREE.Vector2(0,-window.innerHeight/10);
    cloud = new Cloud(numReps,cloudPos,1);
    cloud.setDrift(new THREE.Vector2(0.0,0.03));

    mouse.set(0,window.innerHeight);

    if (cloudMesh.geometry.vertices.length != cloudPoints.length) {
      console.warn("in mesh: " + cloudMesh.geometry.vertices.length + ", in new Array: " + cloudPoints.length);
    }
  }

  function changeDroplet() {
    cloudMesh.material.uniforms.tex.value = cloudTex[Math.floor(Math.random() * cloudTex.length)];
  }

  function getCloudSize() {
    if (window.innerWidth >= window.innerHeight) {
      return window.innerHeight/5;
    }
    return window.innerWidth/4;
  }

  function fadeCloud(fade) {
    if (fade === 0) {
      document.getElementById("theCanvas").classList.add('fadeOut');
    } else if (fade === 1) {
      document.getElementById("theCanvas").classList.remove('fadeOut');
    }
  }

  function finishedFading() {
    //console.log('Transition complete!');
    makeNewCloud();
  }

  function onDocumentMouseMove( e ) {
    // normalized:
    //mouse.x = ( e.clientX / window.innerWidth ) * 2 - 1;
    //mouse.y = - ( e.clientY / window.innerHeight ) * 2 + 1;
    mouse.x = (e.clientX - window.innerWidth/2 );
    mouse.y = - (e.clientY - window.innerHeight/2);
    //console.log(mouse.x + ", " + mouse.y);
  }

  // Throttled on-resize handler
  on_resize(function() {
    resizeElements();
  });

  function resizeElements() {
    //camera.aspect = window.innerWidth/window.innerHeight;
    camera.left = -window.innerWidth/2;
    camera.right = window.innerWidth/2;
    camera.top = window.innerHeight/2;
    camera.bottom = -window.innerHeight/2
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.updateProjectionMatrix();
  }

  function startLerp(dest, speed) {
    colorSpeed = speed || 300;
    colorStep = 0;
    destColor = dest;
  }

  function lerpBg() {
    if (colorStep < colorSpeed) {
      colorStep++;
      var progress = colorStep/colorSpeed;
      currentColor.lerp(destColor,progress);
      skyBg.style.background = "#" + currentColor.getHexString();
    }
  }

  ////////////////////////////////////////////////////////////
  // Cloudlet Class:

  function Cloudlet(gen, totGen) {

  //private:
    var puffPositions = [];         // Vector2[] - center points of children
    var puffs = [];                 // Cloudlet[] - children of this cloudlet
    var maxSize = maxRadius/gen;
    var grows = true;
    var growSpeed = 0.006;

    // Randomization Stuff:
    var size = randomR((maxSize * 0.5),(maxSize * 0.75));
    if (Math.random() < 0.25 && totGen-gen > Math.floor(totGen * 0.4)) {
      maxSize*=1.5;
    }
    if (Math.random() < 0.25) {
      grows = true;
    }
    if (grows && Math.random() < 0.20) {
      growSpeed *= 0.8;
    } else if (grows && Math.random() < 0.01) {
      growSpeed *= 5;
    }
    //if (ofRandom(0,100) < 20 && totGen-gen > floor(totGen * 0.4)) {
    //  maxSize = MAX_RADIUS;
    //}

    if (gen <= totGen) {
      var numChildren = Math.ceil(maxChildren/gen);
      if (numChildren==0) {
        numChildren=1;
      }
      for (var i = 0; i < numChildren; i++) {
        var place = new THREE.Vector2(randomR(-5,5),randomR(-5,5));
        place.setLength(size);
        //console.log("gen: " + gen + ", size: "+ size + ", place length: " + place.length())
        puffPositions.push(place);
        puffs.push(new Cloudlet(gen+1,totGen));
      }
    }

    if (puffPositions.length != puffs.length) {
      console.error("Error! Something is fucked?")
    }

  //public:
    this.update = function(pos) {
      if (grows && size < maxSize) {
        size+=growSpeed;
      }
      var vert = new THREE.Vector3(pos.x, pos.y, size);
      cloudPoints.push(vert);

      puffPositions.forEach(function (pPos,i){
        pPos.setLength(size);
        puffs[i].update(new THREE.Vector2().addVectors(pPos,pos));
      });
    }
  }


  ////////////////////////////////////////////////////////////
  // Cloud Class:


  function Cloud(generations, position, numSeeds) {   // Cloud(int generations,Vector2 position)
  //private:

    var seeds = [];                         // Cloudlet[] - top-level cloudlets that 'seed' the structure
    var flatBottom = false;
    var pos = position;                     // Vector2
    var vel = new THREE.Vector2(0,0);       // Vector2
    var acc = new THREE.Vector2(0,0);       // Vector2
    var maxSpeed = randomR(0.03,0.05);

    for (var i = 0, l = numSeeds; i < l; i++) {
      seeds.push(new Cloudlet(1,generations));
    }

    fadeDir = 1;
    fadeCount = 0;

  //public:
    this.wind = function(w) {               // wind(Vector2 w)
      acc = w;
      vel.add(acc);
      if (vel.mag() > maxSpeed) {
        vel.setLength(maxSpeed);
      }
      acc.setLength(0);
    }

    this.setDrift = function(drift) {       // setDrift(Vector2 drift)
      vel = drift;
    }

    this.setMoveTarget = function(target) { // setDrift(Vector2 drift)
      vel.subVectors(target,pos).clampLength(0,maxSpeed);
    }

    this.update = function() {
      pos.add(vel);
      clearArray(cloudPoints);
      seeds.forEach(function(s){
        s.update(pos);
      });
    }

    // this.setMaxSpeed = function() {
    // };

    this.toggleFlat = function(){
      flatBottom = !flatBottom;
    };

    this.getFlat = function(){
      return flatBottom;
    };

  }


  ////////////////////////////////////////////////////////////
  // Utils:

  // debulked onresize handler
  function on_resize(c,t){onresize=function(){clearTimeout(t);t=setTimeout(c,250);};return c;}

  // Returns a random number between min (inclusive) and max (exclusive)
  function randomR(min, max) {
    return Math.random() * (max - min) + min;
  }

  // Most efficient way of removing all items from array
  function clearArray(arr) {
    //arr.length = 0;
    arr.splice(0,arr.length)
  }

  function map(num, in_min, in_max, out_min, out_max) {
    var out = (num - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
    if (out > out_max) {
      out = out_max;
    }
    if (out < out_min) {
      out = out_min;
    }
    return out;
  }

  function QueryString() {
    var query_string = {};
    var query = window.location.search.substring(1);
    var vars = query.split("&");
    for (var i=0;i<vars.length;i++) {
      var pair = vars[i].split("=");
      if (typeof query_string[pair[0]] === "undefined") {
        query_string[pair[0]] = decodeURIComponent(pair[1]);
      } else if (typeof query_string[pair[0]] === "string") {
        var arr = [ query_string[pair[0]],decodeURIComponent(pair[1]) ];
        query_string[pair[0]] = arr;
      } else {
        query_string[pair[0]].push(decodeURIComponent(pair[1]));
      }
    }
    return query_string;
  };

  // Detect which css transition name is used by this browser:
  // (https://davidwalsh.name/css-animation-callback)
  // function whichTransitionEvent(){
  //   var t;
  //   var el = document.createElement('fakeelement');
  //   var transitions = {
  //     'transition':'transitionend',
  //     'OTransition':'oTransitionEnd',
  //     'MozTransition':'transitionend',
  //     'WebkitTransition':'webkitTransitionEnd'
  //   }

  //   for(t in transitions){
  //     if( el.style[t] !== undefined ){
  //       return transitions[t];
  //     }
  //   }
  // }

}()
