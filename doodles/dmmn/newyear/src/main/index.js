import "@webcomponents/custom-elements";

import "three";

import LoopElement from "dlib/customelements/LoopElement.js";
import Loader from "dlib/utils/Loader.js";

import Scene from "./Scene.js";
import Renderer from "./Renderer.js";

class Main extends LoopElement {
  constructor() {
    super({
      background: true
    });

    this.innerHTML = "<canvas></canvas>";

    this.canvas = this.querySelector("canvas");
    this.canvas.style.cursor = "move";
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";

    this.renderer = new Renderer({canvas: this.canvas});

    this.scene = new Scene({canvas: this.canvas});
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("resize", this.resize.bind(this));
    this.resize();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("resize", this.resize.bind(this));
  }

  resize() {
    let width = this.canvas.offsetWidth;
    let height = this.canvas.offsetHeight;
    this.scene.resize(width, height);
    this.renderer.resize(width, height);
    this.renderer.render(this.scene);
  }

  update() {
    super.update();
    this.scene.update();
    this.renderer.render(this.scene);
  }
}

Loader.onLoad.then(() => {
  window.customElements.define("christmasxp-fireworks", Main);
});
