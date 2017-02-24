import {
  Mesh,
  MeshNormalMaterial,
  Object3D,
  Texture,
  Points,
  Vector3,
  AdditiveBlending,
  Color,
  BufferGeometry,
  BufferAttribute
} from "three";

import THREEShaderMaterial from "dlib/three/THREEShaderMaterial.js";
import Particle from "dlib/physics/Particle.js";

const PARTICLES_NUMBER = 1000;

let TEXTURE;

(function() {
  let canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  let ctx = canvas.getContext("2d");
  let gradient = ctx.createRadialGradient(32, 32, 32, 32, 32, 0);
  gradient.addColorStop(0, "rgba(255, 255, 255, 0)");
  gradient.addColorStop(.25, "rgba(255, 255, 255, 1)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);

  TEXTURE = new Texture(canvas);
  TEXTURE.needsUpdate = true;
})();

export default class Firework extends Object3D {
  constructor({color}) {
    super();

    this.particle = new Particle();
    this.particle.dead = true;

    let vertices = new Float32Array(PARTICLES_NUMBER * 3);
    let opacities = new Float32Array(PARTICLES_NUMBER * 3);

    let vector3 = new Vector3();
    for (let i = 0; i < PARTICLES_NUMBER; i++) {
      vector3.set(
        Math.random() * 20 - 10,
        Math.random() * 20 - 10,
        Math.random() * 20 - 10
      );
      vector3.normalize();
      vector3.multiplyScalar(.5 + Math.random() * .5);

      vertices[i * 3] = vector3.x;
      vertices[i * 3 + 1] = vector3.y;
      vertices[i * 3 + 2] = vector3.z;

      opacities[i] = .5 + .5 * Math.random();
    }

    let geometry = new BufferGeometry();
    geometry.addAttribute("position", new BufferAttribute(vertices, 3));
    geometry.addAttribute("vertexOpacity", new BufferAttribute(opacities, 1));
    this.points = new Points(geometry, new THREEShaderMaterial({
      type: "points",
      transparent: true,
      blending: AdditiveBlending,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        diffuse: new Color(color),
        size: 30,
        opacity: 1,
        map: TEXTURE
      },
      vertexShaderChunks: new Map([
        ["start", `
          #define USE_SIZEATTENUATION

          varying vec3 vPosition;
          varying vec3 vInitialPosition;
          varying float vVertexOpacity;

          uniform vec3 head;
          uniform vec3 tail;
          uniform float explosion;

          attribute float vertexOpacity;
        `],
        [
          "main", `
            vec3 position = position;
            vInitialPosition = position;
            vVertexOpacity = vertexOpacity;

            vec3 trailPosition = tail + (head - tail) * length(position) + position * .01;
            trailPosition.x += cos(trailPosition.y * 10.) * .01;
            trailPosition.z += sin(trailPosition.y * 10.) * .01;

            vec3 explosionPosition = tail + distance(head, tail) * position * .5;

            position = mix(trailPosition, explosionPosition, explosion);

            vPosition = position;
          `
        ]
      ]),
      fragmentShaderChunks: new Map([
        ["start", `
          varying vec3 vPosition;
          varying vec3 vInitialPosition;
          varying float vVertexOpacity;

          uniform vec3 head;
          uniform vec3 tail;
          uniform float explosion;
        `],
        [
          "main", `
            vec3 position = vPosition;

            float opacity = opacity;
            opacity *= smoothstep(0., mix(4., .5, explosion), distance(head, tail));
            opacity *= vVertexOpacity;
            opacity *= mix(1., .8 + ((cos((vPosition.y + length(vInitialPosition)) * 200.) + 1.) * .5) * .2, explosion);

            vec3 diffuse = diffuse;
            diffuse += .5 * mix(0., 1. - smoothstep(0., 4., distance(head, tail)), explosion);
            diffuse += mix(0., ((cos((vPosition.y + length(vInitialPosition)) * 100.) + 1.) * .5) * .5, explosion);
          `
        ]
      ])
    }));
    this.points.frustumCulled = false;
    this.add(this.points);
  }

  reset() {
    this.points.material.explosion = 0;
    this.particle.dead = true;
    this.particle.position.set({
      x: 0,
      y: 0,
      z: 0
    });
    this.particle.velocity.set(0, 0, 0);
    this.points.material.head.set(0, 0, 0);
    this.points.material.tail.set(0, 0, 0);
  }

  launch() {
    this.reset();
    this.points.material.explosion = 0;
    this.particle.position.set(0, 0 ,0);
    this.particle.velocity.set((Math.random() - .5) * .05, .07 + Math.random() * .03, (Math.random() - .5) * .05);
    this.particle.dead = false;
  }

  explode() {
    this.points.material.explosion = 1;
    this.particle.velocity.set(0, 0, .05 + Math.random() * .1);
    this.particle.dead = false;
  }

  update() {
    if(!this.particle.dead) {
      this.particle.velocity.y -= this.points.material.explosion ? .0001 : .001;
    }
    this.particle.update();

    if(!this.points.material.explosion && this.particle.velocity.y < 0) {
      this.particle.dead = true;
      if(this.points.material.tail.distanceTo(this.particle) < .01) {
        this.explode();
      }
    }

    this.points.material.head.copy(this.particle);

    if(!this.points.material.explosion) {
      this.points.material.tail.lerp(this.particle, (1. - this.particle.velocity.y / .1) * .2);
    } else {
      this.points.material.tail.y += (this.particle.y - this.points.material.tail.y) * .01;
    }
  }
}
