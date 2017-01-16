import {
  PerspectiveCamera,
  Mesh,
  BoxGeometry,
  MeshNormalMaterial,
  Scene as THREEScene
} from "three";

import Pointer from "dlib/input/Pointer.js";

import THREETrackballController from "dlib/three/THREETrackballController.js";

import Fireworks from "./fireworks/Fireworks.js";

import Keyboard from "dlib/input/Keyboard.js";

export default class Scene extends THREEScene {
  constructor({canvas}) {
    super();

    this.camera = new PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 10000);

    this.controls = new THREETrackballController(this.camera, {
      distance: 5,
      domElement: canvas
    });

    this.pointer = Pointer.get(canvas);

    this.fireworks = new Fireworks({autoLaunch: false});
    this.add(this.fireworks);

    Keyboard.addEventListener("keyup", (e) => {
      if(e.keyCode === Keyboard.SPACE) {
        this.fireworks.reset();
      }
    });
  }

  resize(width, height) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  update() {
    this.controls.update();

    if(this.pointer.velocity.size) {
      this.fireworks.launchFireworkAt(this.pointer.centeredFlippedY.x * .0075, this.pointer.centeredFlippedY.y * .008);
    }

    this.fireworks.update();
  }
}
