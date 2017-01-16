import THREERenderer from "dlib/three/THREERenderer.js";
import THREEShaderMaterial from "dlib/three/THREEShaderMaterial.js";
import AntialiasGLSL from "dlib/shaders/AntialiasGLSL.js";

import Environment from "dlib/utils/Environment.js";

export default class Renderer extends THREERenderer {
  constructor(options) {
    super(Object.assign({antialias: true}, options));

    this.setClearColor("#0e1430", 1);

    if(!this.context.getContextAttributes().antialias && !Environment.mobile) {
      this.filters.push(this.fxaaFilter = new THREEShaderMaterial({
        vertexShader: `
        uniform vec2 resolution;
        varying vec2 vUv;
        ${AntialiasGLSL.vertex()}
        void main() {
          computeFXAATextureCoordinates(uv, resolution);
          vUv = uv;
          gl_Position = vec4(position, 1.);
        }
        `,
        fragmentShader: `
        uniform vec2 resolution;
        uniform sampler2D texture;
        varying vec2 vUv;
        ${AntialiasGLSL.fragment()}
        void main() {
          gl_FragColor = fxaa(texture, vUv, resolution);
        }
        `
      }));
    }
  }

  resize(width, height) {
    width *= window.devicePixelRatio;
    height *= window.devicePixelRatio;
    super.resize(width, height);
    if(this.fxaaFilter) {
      this.fxaaFilter.resolution.set(width, height);
    }
  }
}
