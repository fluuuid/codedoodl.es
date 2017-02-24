window.onload = init;

var CONFIG = {
  pointCount: 20000,
  extrudeAmount: 2.0,
  splineStepsX: 3,
  splineStepsY: 3,
};

function init() {
  var root = new THREERoot({
    createCameraControls: true,
    antialias: (window.devicePixelRatio === 1),
    fov: 60
  });
  root.renderer.setClearColor(0x000000);
  root.camera.position.set(0, 0, 90);

  var light = new THREE.PointLight(0xffffff, 1.0);
  //light.position.set(0, 0, 1);
  root.add(light);

  var vertices = [], indices, i, j;

  // 1. generate random points in grid formation with some noise
  var PHI = Math.PI * (3 - Math.sqrt(5));
  var n = CONFIG.pointCount;
  var radius = 100;
  var noise = 4.0;

  for (i = 0; i <= n; i++) {
    var t = i * PHI;
    var r = Math.sqrt(i) / Math.sqrt(n);
    var x = r * Math.cos(t) * (radius - THREE.Math.randFloat(0, noise));
    var y = r * Math.sin(t) * (radius - THREE.Math.randFloatSpread(0, noise));

    vertices.push([x, y]);
  }

  // 2. generate indices
  indices = Delaunay.triangulate(vertices);

  // 3. create displacement splines
  var pointsX = [];
  var pointsY = [];
  var segmentsX = CONFIG.splineStepsX;
  var segmentsY = CONFIG.splineStepsY;

  for (i = 0; i <= segmentsX; i++) {
    pointsX.push(new THREE.Vector3(
      THREE.Math.mapLinear(i, 0, segmentsX, -radius, radius),
      0,
      (i === 0 || i === segmentsX) ? 0 : -THREE.Math.randFloat(72, 96)
    ));
  }
  for (i = 0; i <= segmentsY; i++) {
    pointsY.push(new THREE.Vector3(
      0,
      THREE.Math.mapLinear(i, 0, segmentsY, -radius, radius),
      (i === 0 || i === segmentsY) ? 0 : -THREE.Math.randFloat(72, 96)
    ));
  }

  var splineX = new THREE.CatmullRomCurve3(pointsX);
  var splineY = new THREE.CatmullRomCurve3(pointsY);

  // line geometries for testing

  //var g, m;
  //g = new THREE.Geometry();
  //g.vertices = splineX.getPoints(50);
  //m = new THREE.LineBasicMaterial({color: 0xff0000});
  //root.add(new THREE.Line(g, m));
  //g = new THREE.Geometry();
  //g.vertices = splineY.getPoints(50);
  //m = new THREE.LineBasicMaterial({color: 0x00ff00});
  //root.add(new THREE.Line(g, m));

  // 4. generate geometry (maybe find a cheaper way to do this)
  var geometry = new THREE.Geometry();
  var shapeScale = 0.95;

  for (i = 0; i < indices.length; i += 3) {
    // build the face
    var v0 = vertices[indices[i]];
    var v1 = vertices[indices[i + 1]];
    var v2 = vertices[indices[i + 2]];

    // calculate centroid
    var cx = (v0[0] + v1[0] + v2[0]) / 3;
    var cy = (v0[1] + v1[1] + v2[1]) / 3;

    // translate, scale, un-translate
    v0 = [(v0[0] - cx) * shapeScale + cx, (v0[1] - cy) * shapeScale + cy];
    v1 = [(v1[0] - cx) * shapeScale + cx, (v1[1] - cy) * shapeScale + cy];
    v2 = [(v2[0] - cx) * shapeScale + cx, (v2[1] - cy) * shapeScale + cy];

    // draw the face to a shape
    var shape = new THREE.Shape();
    shape.moveTo(v0[0], v0[1]);
    shape.lineTo(v1[0], v1[1]);
    shape.lineTo(v2[0], v2[1]);

    // use the shape to create a geometry
    var shapeGeometry = new THREE.ExtrudeGeometry(shape, {
      amount: CONFIG.extrudeAmount,
      bevelEnabled: false
    });

    // offset z vector components based on the two splines
    for (j = 0; j < shapeGeometry.vertices.length; j++) {
      var v = shapeGeometry.vertices[j];
      var ux = THREE.Math.clamp(THREE.Math.mapLinear(v.x, -radius, radius, 0.0, 1.0), 0.0, 1.0);
      var uy = THREE.Math.clamp(THREE.Math.mapLinear(v.y, -radius, radius, 0.0, 1.0), 0.0, 1.0);

      v.z += splineX.getPointAt(ux).z;
      v.z += splineY.getPointAt(uy).z;
    }

    // merge into the whole
    geometry.merge(shapeGeometry);
  }

  geometry.center();

  // 5. feed the geometry to the animation
  var animation = new Animation(geometry);
  root.add(animation);

  // interactive
  var paused = false;
  var color = new THREE.Color(0x5c0a12);
  var hsl = color.getHSL();

  root.addUpdateCallback(function() {
    if (paused) return;

    hsl.h += 0.001;
    hsl.h %= 1.0;

    animation.time += (1/30);
    animation.material.uniforms['diffuse'].value.setHSL(hsl.h, hsl.s, hsl.l);
  });

  root.container.addEventListener('mousemove', function(e) {
    handlePointerMove(e.clientX, e.clientY);
  });

  function handlePointerMove(x, y) {
    if (paused) return;

    var px = x / window.innerWidth;
    var py = y / window.innerHeight;

    animation.material.uniforms['uD'].value = 2.0 + px * 16;
    animation.material.uniforms['uA'].value = py * 4.0;

    animation.material.uniforms['roughness'].value = px;
    animation.material.uniforms['metalness'].value = py;
  }

  window.addEventListener('keyup', function(e) {
    e.keyCode === 80 && (paused = !paused);
  });

  // post processing
  var bloomPass = new THREE.BloomPass(1.5, 25, 4, 512);
  var copyPass = new THREE.ShaderPass(THREE.CopyShader);

  root.initPostProcessing([
    bloomPass,
    copyPass
  ]);
}

////////////////////
// CLASSES
////////////////////

function Animation(modelGeometry) {
  var geometry = new THREE.BAS.ModelBufferGeometry(modelGeometry);

  var i, j;

  var aOffsetAmplitude = geometry.createAttribute('aOffsetAmplitude', 2);
  var positionBuffer = geometry.getAttribute('position').array;
  var x, y, distance;

  for (i = 0; i < aOffsetAmplitude.array.length; i += 12) { // 6 * 2
    var offset = THREE.Math.randFloat(1, 4);
    var amplitude = THREE.Math.randFloat(0.5, 1.0);

    x = 0;
    y = 0;

    // x/y position of the corresponding vertex from the position buffer
    for (j = 0; j < 6; j += 2) {
      x += positionBuffer[(i + j) / 2 * 3];
      y += positionBuffer[(i + j) / 2 * 3 + 1];
    }

    x /= 3;
    y /= 3;

    distance = Math.sqrt(x * x + y * y);

    for (j = 0; j < 12; j += 2) {
      aOffsetAmplitude.array[i + j]     = (distance + offset) * (1.0 + THREE.Math.randFloatSpread(0.0125));
      aOffsetAmplitude.array[i + j + 1] = amplitude;
    }
  }

  var aColor = geometry.createAttribute('color', 3);
  var color = new THREE.Color();

  for (i = 0; i < aColor.array.length; i += 18) { // 6 * 3
    color.setHSL(0, 0, THREE.Math.randFloat(0.5, 1.0));

    for (j = 0; j < 18; j += 3) {
      aColor.array[i + j]     = color.r;
      aColor.array[i + j + 1] = color.g;
      aColor.array[i + j + 2] = color.b;
    }
  }

  var material = new THREE.BAS.StandardAnimationMaterial({
    shading: THREE.FlatShading,
    vertexColors: THREE.VertexColors,
    transparent: true,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: {value: 0},
      uD: {value: 4.4},
      uA: {value: 3.2}
    },
    vertexFunctions: [
      THREE.BAS.ShaderChunk['ease_cubic_in_out']
    ],
    vertexParameters: [
      'uniform float uTime;',
      'uniform float uD;',
      'uniform float uA;',
      'attribute vec2 aOffsetAmplitude;'
    ],
    vertexPosition: [
      'float tProgress = sin(uTime + aOffsetAmplitude.x / uD);',
      'tProgress = easeCubicInOut(tProgress);',
      'transformed.z += aOffsetAmplitude.y * uA * tProgress;'
    ]
  }, {
    diffuse: 0x9B111E,
    roughness: 0.2,
    metalness: 0.8,
    opacity: 0.8
  });

  geometry.computeVertexNormals();

  THREE.Mesh.call(this, geometry, material);

  this.frustumCulled = false;
}
Animation.prototype = Object.create(THREE.Mesh.prototype);
Animation.prototype.constructor = Animation;
Object.defineProperty(Animation.prototype, 'time', {
  get: function () {
    return this.material.uniforms['uTime'].value;
  },
  set: function (v) {
    this.material.uniforms['uTime'].value = v;
  }
});
