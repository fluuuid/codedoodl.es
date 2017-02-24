import {
  Mesh,
  MeshNormalMaterial,
  Object3D
} from "three";

import Firework from "./Firework.js";

const COLORS = [
  "#ff4700",
  "#c700e0",
  "#665dff",
  "#0c00ff",
  "#ffffff",
];

export default class Fireworks extends Object3D {
  constructor({autoLaunch = true} = {}) {
    super();

    this.fireworks = [];

    for (let i = 0; i < 200; i++) {
      let firework = new Firework({
        color: COLORS[i % COLORS.length]
      });
      this.fireworks.push(firework);
      this.add(firework);
    }

    if(autoLaunch) {
      this.launch();
    }
  }

  reset() {
    for (let firework of this.fireworks) {
      firework.reset();
    }
  }

  launch() {
    for (let firework of this.fireworks) {
      firework.position.set(
        Math.random() * 10 - 5,
        -3,
        0
      );
      firework.reset();
      setTimeout(() => {
        firework.launch();
      }, 3000 * Math.random());
    }
  }

  launchFireworkAt(x, y) {
    let firework = this.fireworks[0];
    this.fireworks.push(this.fireworks.shift());
    firework.position.set(
      x,
      y,
      0
    );
    firework.launch();
  }

  update() {
    for (let firework of this.fireworks) {
      firework.update();
    }
  }
}
