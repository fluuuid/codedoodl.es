(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) _i['return'](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } }; })();

var _twglJs = require('twgl.js');

var _utils = require('utils');

var PARTICLE_COUNT = 420;
var PROXIMITY_THRESHOLD = 0.14;
var SPEED = 0.00002;

var continuePlaying = true;
var mouseX = (0, _utils.random)(-1, 1);
var mouseY = (0, _utils.random)(-1, 1);
var shaders = ['shaders/point.vs', 'shaders/point.fs', 'shaders/edge.vs', 'shaders/edge.fs'];

Promise.all(shaders.map(get)).then(main);

function main(_ref) {
    var _ref2 = _slicedToArray(_ref, 4);

    var pointVs = _ref2[0];
    var pointFs = _ref2[1];
    var edgeVs = _ref2[2];
    var edgeFs = _ref2[3];

    ////////// setup webgl

    var container = document.querySelector('.container');

    var _container$getBoundingClientRect = container.getBoundingClientRect();

    var height = _container$getBoundingClientRect.height;
    var width = _container$getBoundingClientRect.width;

    var gl = setupGL(container);
    resize(height, width, gl);

    var pointProgramInfo = _twglJs.twgl.createProgramInfo(gl, [pointVs, pointFs]);
    var edgeProgramInfo = _twglJs.twgl.createProgramInfo(gl, [edgeVs, edgeFs]);

    var _buildParticleBuffers = buildParticleBuffers(PARTICLE_COUNT, SPEED);

    var particles = _buildParticleBuffers.particles;
    var velocities = _buildParticleBuffers.velocities;

    var _buildEdgeBuffers = buildEdgeBuffers(particles, velocities);

    var edges = _buildEdgeBuffers.edges;
    var edgeVelocities = _buildEdgeBuffers.edgeVelocities;

    var particleBuffer = fillBuffers(gl, pointProgramInfo, particles, velocities, 2);
    var edgeBuffer = fillBuffers(gl, edgeProgramInfo, edges, edgeVelocities, 4);

    ////////// event handlers

    document.addEventListener('mousemove', function (e) {
        var clientX = e.clientX;
        var clientY = e.clientY;

        clientX -= width / 2;
        clientY -= height / 2;
        mouseX = clientX / (width / 2);
        mouseY = clientY / (height / 2);
    });

    window.addEventListener('resize', function () {
        var rect = container.getBoundingClientRect();
        height = rect.height;
        width = rect.width;
        resize(height, width, gl);
    });

    ///////// animation loop

    var start = Date.now() % (1000 * 60 * 60);
    function frame(t) {
        requestAnimationFrame(frame);
        t += start;
        gl.disable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_CONSTANT_ALPHA);

        drawBuffer(gl, pointProgramInfo, gl.POINTS, particleBuffer, {
            'u_time': t,
            'u_mouse': [mouseX, mouseY]
        });

        drawBuffer(gl, edgeProgramInfo, gl.LINES, edgeBuffer, {
            'u_threshold': PROXIMITY_THRESHOLD,
            'u_time': t,
            'u_mouse': [mouseX, mouseY]
        });
    }

    requestAnimationFrame(frame);
}

function drawBuffer(gl, program, DRAW_MODE, buff, uniforms) {
    gl.useProgram(program.program);
    _twglJs.twgl.setUniforms(program, uniforms);
    _twglJs.twgl.drawBufferInfo(gl, DRAW_MODE, buff);
}

function setupGL(container) {
    var canvas = document.createElement('canvas');
    container.appendChild(canvas);
    var gl = _twglJs.twgl.getWebGLContext(canvas);
    _twglJs.twgl.resizeCanvasToDisplaySize(gl.canvas);
    return gl;
}

function resize(height, width, gl) {
    var size = Math.max(height, width);
    gl.canvas.style.height = size + 'px';
    gl.canvas.style.width = size + 'px';
    gl.canvas.width = gl.canvas.height = size;
    var top = size > height ? (height - size) / 2 : 0;
    var left = size > width ? (width - size) / 2 : 0;
    gl.canvas.style.position = 'relative';
    gl.canvas.style.top = top + 'px';
    gl.canvas.style.left = left + 'px';
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
}

function fillBuffers(gl, program, positions, velocities, size) {
    var arrays = {
        position: { numComponents: size, data: positions },
        velocity: { numComponents: size, data: velocities }
    };

    var buffer = _twglJs.twgl.createBufferInfoFromArrays(gl, arrays);
    _twglJs.twgl.setBuffersAndAttributes(gl, program, buffer);
    return buffer;
}

function buildParticleBuffers(count, speed) {
    var particles = new Float32Array(count * 2);
    var velocities = new Float32Array(count * 2);
    var j = count * 2;
    while (j--) {
        particles[j] = (0, _utils.random)(-1, 1);
        velocities[j] = (0, _utils.random)(-speed, speed);
    }
    return { particles: particles, velocities: velocities };
}

function buildEdgeBuffers(particlePositions, particleVelocities) {
    var k = 0;
    var p = 0;
    var edgesCount = PARTICLE_COUNT * (PARTICLE_COUNT - 1);
    var edges = new Float32Array(edgesCount * 8 / 2);
    var edgeVelocities = new Float32Array(edgesCount * 8 / 2);
    for (var i = 0, len = particlePositions.length; i < len; i += 2) {
        var p1X = particlePositions[i];
        var p1Y = particlePositions[i + 1];
        var v1X = particleVelocities[i];
        var v1Y = particleVelocities[i + 1];
        for (var j = i + 2, leng = particlePositions.length; j < leng; j += 2) {
            var p2X = particlePositions[j];
            var p2Y = particlePositions[j + 1];

            edges[k++] = p1X;
            edges[k++] = p1Y;
            edges[k++] = p2X;
            edges[k++] = p2Y;
            edges[k++] = p2X;
            edges[k++] = p2Y;
            edges[k++] = p1X;
            edges[k++] = p1Y;

            var v2X = particleVelocities[j];
            var v2Y = particleVelocities[j + 1];

            edgeVelocities[p++] = v1X;
            edgeVelocities[p++] = v1Y;
            edgeVelocities[p++] = v2X;
            edgeVelocities[p++] = v2Y;
            edgeVelocities[p++] = v2X;
            edgeVelocities[p++] = v2Y;
            edgeVelocities[p++] = v1X;
            edgeVelocities[p++] = v1Y;
        }
    }

    return { edges: edges, edgeVelocities: edgeVelocities };
}

function get(url) {
    return new Promise(function (resolve, reject) {
        var request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.onload = function () {
            (this.status >= 200 && this.status < 400 ? resolve : reject)(this.response);
        };
        request.onerror = function () {
            reject(this.response);
        };
        request.send();
    });
}

},{"twgl.js":2,"utils":3}],2:[function(require,module,exports){
/**
 * @license twgl.js 0.0.25 Copyright (c) 2015, Gregg Tavares All Rights Reserved.
 * Available via the MIT license.
 * see: http://github.com/greggman/twgl.js for details
 */
/**
 * @license almond 0.3.1 Copyright (c) 2011-2014, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
!function(a,b){"function"==typeof define&&define.amd?define([],b):a.twgl=b()}(this,function(){var a,b,c;return function(d){function e(a,b){return u.call(a,b)}function f(a,b){var c,d,e,f,g,h,i,j,k,l,m,n=b&&b.split("/"),o=s.map,p=o&&o["*"]||{};if(a&&"."===a.charAt(0))if(b){for(a=a.split("/"),g=a.length-1,s.nodeIdCompat&&w.test(a[g])&&(a[g]=a[g].replace(w,"")),a=n.slice(0,n.length-1).concat(a),k=0;k<a.length;k+=1)if(m=a[k],"."===m)a.splice(k,1),k-=1;else if(".."===m){if(1===k&&(".."===a[2]||".."===a[0]))break;k>0&&(a.splice(k-1,2),k-=2)}a=a.join("/")}else 0===a.indexOf("./")&&(a=a.substring(2));if((n||p)&&o){for(c=a.split("/"),k=c.length;k>0;k-=1){if(d=c.slice(0,k).join("/"),n)for(l=n.length;l>0;l-=1)if(e=o[n.slice(0,l).join("/")],e&&(e=e[d])){f=e,h=k;break}if(f)break;!i&&p&&p[d]&&(i=p[d],j=k)}!f&&i&&(f=i,h=j),f&&(c.splice(0,h,f),a=c.join("/"))}return a}function g(a,b){return function(){var c=v.call(arguments,0);return"string"!=typeof c[0]&&1===c.length&&c.push(null),n.apply(d,c.concat([a,b]))}}function h(a){return function(b){return f(b,a)}}function i(a){return function(b){q[a]=b}}function j(a){if(e(r,a)){var b=r[a];delete r[a],t[a]=!0,m.apply(d,b)}if(!e(q,a)&&!e(t,a))throw new Error("No "+a);return q[a]}function k(a){var b,c=a?a.indexOf("!"):-1;return c>-1&&(b=a.substring(0,c),a=a.substring(c+1,a.length)),[b,a]}function l(a){return function(){return s&&s.config&&s.config[a]||{}}}var m,n,o,p,q={},r={},s={},t={},u=Object.prototype.hasOwnProperty,v=[].slice,w=/\.js$/;o=function(a,b){var c,d=k(a),e=d[0];return a=d[1],e&&(e=f(e,b),c=j(e)),e?a=c&&c.normalize?c.normalize(a,h(b)):f(a,b):(a=f(a,b),d=k(a),e=d[0],a=d[1],e&&(c=j(e))),{f:e?e+"!"+a:a,n:a,pr:e,p:c}},p={require:function(a){return g(a)},exports:function(a){var b=q[a];return"undefined"!=typeof b?b:q[a]={}},module:function(a){return{id:a,uri:"",exports:q[a],config:l(a)}}},m=function(a,b,c,f){var h,k,l,m,n,s,u=[],v=typeof c;if(f=f||a,"undefined"===v||"function"===v){for(b=!b.length&&c.length?["require","exports","module"]:b,n=0;n<b.length;n+=1)if(m=o(b[n],f),k=m.f,"require"===k)u[n]=p.require(a);else if("exports"===k)u[n]=p.exports(a),s=!0;else if("module"===k)h=u[n]=p.module(a);else if(e(q,k)||e(r,k)||e(t,k))u[n]=j(k);else{if(!m.p)throw new Error(a+" missing "+k);m.p.load(m.n,g(f,!0),i(k),{}),u[n]=q[k]}l=c?c.apply(q[a],u):void 0,a&&(h&&h.exports!==d&&h.exports!==q[a]?q[a]=h.exports:l===d&&s||(q[a]=l))}else a&&(q[a]=c)},a=b=n=function(a,b,c,e,f){if("string"==typeof a)return p[a]?p[a](b):j(o(a,b).f);if(!a.splice){if(s=a,s.deps&&n(s.deps,s.callback),!b)return;b.splice?(a=b,b=c,c=null):a=d}return b=b||function(){},"function"==typeof c&&(c=e,e=f),e?m(d,a,b,c):setTimeout(function(){m(d,a,b,c)},4),n},n.config=function(a){return n(a)},a._defined=q,c=function(a,b,c){if("string"!=typeof a)throw new Error("See almond README: incorrect module build, no module name");b.splice||(c=b,b=[]),e(q,a)||e(r,a)||(r[a]=[a,b,c])},c.amd={jQuery:!0}}(),c("node_modules/almond/almond.js",function(){}),c("twgl/twgl",[],function(){function a(a){ea=new Uint8Array([255*a[0],255*a[1],255*a[2],255*a[3]])}function b(a){da=a}function c(a,b){for(var c=["webgl","experimental-webgl"],d=null,e=0;e<c.length;++e){try{d=a.getContext(c[e],b)}catch(f){}if(d)break}return d}function d(a,b){var d=c(a,b);return d}function e(a){return a.split("\n").map(function(a,b){return b+1+": "+a}).join("\n")}function f(a,b,c,d){var f=d||ca,g=a.createShader(c);a.shaderSource(g,b),a.compileShader(g);var h=a.getShaderParameter(g,a.COMPILE_STATUS);if(!h){var i=a.getShaderInfoLog(g);return f(e(b)+"\n*** Error compiling shader: "+i),a.deleteShader(g),null}return g}function g(a,b,c,d,e){var f=e||ca,g=a.createProgram();b.forEach(function(b){a.attachShader(g,b)}),c&&c.forEach(function(b,c){a.bindAttribLocation(g,d?d[c]:c,b)}),a.linkProgram(g);var h=a.getProgramParameter(g,a.LINK_STATUS);if(!h){var i=a.getProgramInfoLog(g);return f("Error in program linking:"+i),a.deleteProgram(g),null}return g}function h(a,b,c,d){var e,g="",h=document.getElementById(b);if(!h)throw"*** Error: unknown script element"+b;if(g=h.text,!c)if("x-shader/x-vertex"===h.type)e=a.VERTEX_SHADER;else if("x-shader/x-fragment"===h.type)e=a.FRAGMENT_SHADER;else if(e!==a.VERTEX_SHADER&&e!==a.FRAGMENT_SHADER)throw"*** Error: unknown shader type";return f(a,g,c?c:e,d)}function i(a,b,c,d,e){for(var f=[],i=0;i<b.length;++i){var j=h(a,b[i],a[Ha[i]],e);if(!j)return null;f.push(j)}return g(a,f,c,d,e)}function j(a,b,c,d,e){for(var h=[],i=0;i<b.length;++i){var j=f(a,b[i],a[Ha[i]],e);if(!j)return null;h.push(j)}return g(a,h,c,d,e)}function k(a,b){return b===a.SAMPLER_2D?a.TEXTURE_2D:b===a.SAMPLER_CUBE?a.TEXTURE_CUBE_MAP:void 0}function l(a,b){function c(b,c){var e=a.getUniformLocation(b,c.name),f=c.type,g=c.size>1&&"[0]"===c.name.substr(-3);if(f===a.FLOAT&&g)return function(b){a.uniform1fv(e,b)};if(f===a.FLOAT)return function(b){a.uniform1f(e,b)};if(f===a.FLOAT_VEC2)return function(b){a.uniform2fv(e,b)};if(f===a.FLOAT_VEC3)return function(b){a.uniform3fv(e,b)};if(f===a.FLOAT_VEC4)return function(b){a.uniform4fv(e,b)};if(f===a.INT&&g)return function(b){a.uniform1iv(e,b)};if(f===a.INT)return function(b){a.uniform1i(e,b)};if(f===a.INT_VEC2)return function(b){a.uniform2iv(e,b)};if(f===a.INT_VEC3)return function(b){a.uniform3iv(e,b)};if(f===a.INT_VEC4)return function(b){a.uniform4iv(e,b)};if(f===a.BOOL)return function(b){a.uniform1iv(e,b)};if(f===a.BOOL_VEC2)return function(b){a.uniform2iv(e,b)};if(f===a.BOOL_VEC3)return function(b){a.uniform3iv(e,b)};if(f===a.BOOL_VEC4)return function(b){a.uniform4iv(e,b)};if(f===a.FLOAT_MAT2)return function(b){a.uniformMatrix2fv(e,!1,b)};if(f===a.FLOAT_MAT3)return function(b){a.uniformMatrix3fv(e,!1,b)};if(f===a.FLOAT_MAT4)return function(b){a.uniformMatrix4fv(e,!1,b)};if((f===a.SAMPLER_2D||f===a.SAMPLER_CUBE)&&g){for(var h=[],i=0;i<c.size;++i)h.push(d++);return function(b,c){return function(d){a.uniform1iv(e,c),d.forEach(function(d,e){a.activeTexture(a.TEXTURE0+c[e]),a.bindTexture(b,d)})}}(k(a,f),h)}if(f===a.SAMPLER_2D||f===a.SAMPLER_CUBE)return function(b,c){return function(d){a.uniform1i(e,c),a.activeTexture(a.TEXTURE0+c),a.bindTexture(b,d)}}(k(a,f),d++);throw"unknown type: 0x"+f.toString(16)}for(var d=0,e={},f=a.getProgramParameter(b,a.ACTIVE_UNIFORMS),g=0;f>g;++g){var h=a.getActiveUniform(b,g);if(!h)break;var i=h.name;"[0]"===i.substr(-3)&&(i=i.substr(0,i.length-3));var j=c(b,h);e[i]=j}return e}function m(a,b){a=a.uniformSetters||a;for(var c=arguments.length,d=1;c>d;++d){var e=arguments[d];if(Array.isArray(e))for(var f=e.length,g=0;f>g;++g)m(a,e[g]);else for(var h in e){var i=a[h];i&&i(e[h])}}}function n(a,b){function c(b){return function(c){a.bindBuffer(a.ARRAY_BUFFER,c.buffer),a.enableVertexAttribArray(b),a.vertexAttribPointer(b,c.numComponents||c.size,c.type||a.FLOAT,c.normalize||!1,c.stride||0,c.offset||0)}}for(var d={},e=a.getProgramParameter(b,a.ACTIVE_ATTRIBUTES),f=0;e>f;++f){var g=a.getActiveAttrib(b,f);if(!g)break;var h=a.getAttribLocation(b,g.name);d[g.name]=c(h)}return d}function o(a,b){for(var c in b){var d=a[c];d&&d(b[c])}}function p(a,b,c){o(b.attribSetters||b,c.attribs),c.indices&&a.bindBuffer(a.ELEMENT_ARRAY_BUFFER,c.indices)}function q(a,b,c,d,e){b=b.map(function(a){var b=document.getElementById(a);return b?b.text:a});var f=j(a,b,c,d,e);if(!f)return null;var g=l(a,f),h=n(a,f);return{program:f,uniformSetters:g,attribSetters:h}}function r(a,b){b=b||1,b=Math.max(1,b);var c=a.clientWidth*b|0,d=a.clientHeight*b|0;return a.width!==c||a.height!==d?(a.width=c,a.height=d,!0):!1}function s(a,b,c,d){if(b instanceof WebGLBuffer)return b;c=c||a.ARRAY_BUFFER;var e=a.createBuffer();return a.bindBuffer(c,e),a.bufferData(c,b,d||a.STATIC_DRAW),e}function t(a){return"indices"===a}function u(a){if(a instanceof Int8Array)return ga;if(a instanceof Uint8Array)return ha;if(a instanceof Int16Array)return ia;if(a instanceof Uint16Array)return ja;if(a instanceof Int32Array)return ka;if(a instanceof Uint32Array)return la;if(a instanceof Float32Array)return ma;throw"unsupported typed array type"}function v(a,b){switch(b){case a.BYTE:return Int8Array;case a.UNSIGNED_BYTE:return Uint8Array;case a.SHORT:return Int16Array;case a.UNSIGNED_SHORT:return Uint16Array;case a.INT:return Int32Array;case a.UNSIGNED_INT:return Uint32Array;case a.FLOAT:return Float32Array;default:throw"unknown gl type"}}function w(a){return a instanceof Int8Array?!0:a instanceof Uint8Array?!0:!1}function x(a){return a&&a.buffer&&a.buffer instanceof ArrayBuffer}function y(a,b){var c;if(c=a.indexOf("coord")>=0?2:a.indexOf("color")>=0?4:3,b%c>0)throw"can not guess numComponents. You should specify it.";return c}function z(a,b){if(x(a))return a;if(x(a.data))return a.data;Array.isArray(a)&&(a={data:a});var c=a.type;return c||(c="indices"===b?Uint16Array:Float32Array),new c(a.data)}function A(a,b){var c={};return Object.keys(b).forEach(function(d){if(!t(d)){var e=b[d],f=e.attrib||e.name||e.attribName||da+d,g=z(e,d);c[f]={buffer:s(a,g,void 0,e.drawType),numComponents:e.numComponents||e.size||y(d),type:u(g),normalize:void 0!==e.normalize?e.normalize:w(g),stride:e.stride||0,offset:e.offset||0}}}),c}function B(a,b){var c={attribs:A(a,b)},d=b.indices;return d?(d=z(d,"indices"),c.indices=s(a,d,a.ELEMENT_ARRAY_BUFFER),c.numElements=d.length,c.elementType=d instanceof Uint32Array?a.UNSIGNED_INT:a.UNSIGNED_SHORT):c.numElements=Ia(b),c}function C(a,b){var c={};return Object.keys(b).forEach(function(d){var e="indices"===d?a.ELEMENT_ARRAY_BUFFER:a.ARRAY_BUFFER,f=z(b[d],d);c[d]=s(a,f,e)}),c}function D(a,b,c,d,e){var f=c.indices,g=void 0===d?c.numElements:d;e=void 0===e?0:e,f?a.drawElements(b,g,void 0===c.elementType?a.UNSIGNED_SHORT:c.elementType,e):a.drawArrays(b,e,g)}function E(a,b){var c=null,d=null;b.forEach(function(b){if(b.active!==!1){var e=b.programInfo,f=b.bufferInfo,g=!1;e!==c&&(c=e,a.useProgram(e.program),g=!0),(g||f!==d)&&(d=f,p(a,e,f)),m(e,b.uniforms),D(a,b.type||a.TRIANGLES,f,b.count,b.offset)}})}function F(a,b){void 0!==b.colorspaceConversion&&(Ja.colorSpaceConversion=a.getParameter(a.UNPACK_COLORSPACE_CONVERSION_WEBGL)),void 0!==b.premultiplyAlpha&&(Ja.premultiplyAlpha=a.getParameter(a.UNPACK_PREMULTIPLY_ALPHA_WEBGL)),void 0!==b.flipY&&(Ja.flipY=a.getParameter(a.UNPACK_FLIP_Y_WEBGL))}function G(a,b){void 0!==b.colorspaceConversion&&a.pixelStorei(a.UNPACK_COLORSPACE_CONVERSION_WEBGL,Ja.colorSpaceConversion),void 0!==b.premultiplyAlpha&&a.pixelStorei(a.UNPACK_PREMULTIPLY_ALPHA_WEBGL,Ja.premultiplyAlpha),void 0!==b.flipY&&a.pixelStorei(a.UNPACK_FLIP_Y_WEBGL,Ja.flipY)}function H(a,b,c){var d=c.target||a.TEXTURE_2D;a.bindTexture(d,b),c.min&&a.texParameteri(d,a.TEXTURE_MIN_FILTER,c.min),c.mag&&a.texParameteri(d,a.TEXTURE_MAG_FILTER,c.mag),c.wrap&&(a.texParameteri(d,a.TEXTURE_WRAP_S,c.wrap),a.texParameteri(d,a.TEXTURE_WRAP_T,c.wrap)),c.wrapS&&a.texParameteri(d,a.TEXTURE_WRAP_S,c.wrapS),c.wrapT&&a.texParameteri(d,a.TEXTURE_WRAP_T,c.wrapT)}function I(a){return a=a||ea,x(a)?a:new Uint8Array([255*a[0],255*a[1],255*a[2],255*a[3]])}function J(a){return 0===(a&a-1)}function K(a,b,c,d,e){c=c||fa;var f=c.target||a.TEXTURE_2D;d=d||c.width,e=e||c.height,a.bindTexture(f,b),J(d)&&J(e)?a.generateMipmap(f):(a.texParameteri(f,a.TEXTURE_MIN_FILTER,a.LINEAR),a.texParameteri(f,a.TEXTURE_WRAP_S,a.CLAMP_TO_EDGE),a.texParameteri(f,a.TEXTURE_WRAP_T,a.CLAMP_TO_EDGE))}function L(a,b){return b=b||{},b.cubeFaceOrder||[a.TEXTURE_CUBE_MAP_POSITIVE_X,a.TEXTURE_CUBE_MAP_NEGATIVE_X,a.TEXTURE_CUBE_MAP_POSITIVE_Y,a.TEXTURE_CUBE_MAP_NEGATIVE_Y,a.TEXTURE_CUBE_MAP_POSITIVE_Z,a.TEXTURE_CUBE_MAP_NEGATIVE_Z]}function M(a,b){var c=L(a,b),d=c.map(function(a,b){return{face:a,ndx:b}});return d.sort(function(a,b){return a.face-b.face}),d}function N(a){var b={};return Object.keys(a).forEach(function(c){b[c]=a[c]}),b}function O(a,b){var c=new Image;return c.onerror=function(){var d="couldn't load image: "+a;ca(d),b(d,c)},c.onload=function(){b(null,c)},c.src=a,c}function P(a,b,c){c=c||fa;var d=c.target||a.TEXTURE_2D;if(a.bindTexture(d,b),c.color!==!1){var e=I(c.color);if(d===a.TEXTURE_CUBE_MAP)for(var f=0;6>f;++f)a.texImage2D(a.TEXTURE_CUBE_MAP_POSITIVE_X+f,0,a.RGBA,1,1,0,a.RGBA,a.UNSIGNED_BYTE,e);else a.texImage2D(d,0,a.RGBA,1,1,0,a.RGBA,a.UNSIGNED_BYTE,e)}}function Q(a,b,c,d){c=c||fa,P(a,b,c),c=N(c);var e=O(c.src,function(e,f){e?d(e,b,f):(Ka(a,b,f,c),d(null,b,f))});return e}function R(a,b,c,d){function e(e){return function(f,m){--k,f?l.push(f):m.width!==m.height?l.push("cubemap face img is not a square: "+m.src):(F(a,c),a.bindTexture(i,b),5===k?L(a).forEach(function(b){a.texImage2D(b,0,g,g,h,m)}):a.texImage2D(e,0,g,g,h,m),G(a,c),a.generateMipmap(i)),0===k&&d&&d(l.length?l:void 0,j,b)}}var f=c.src;if(6!==f.length)throw"there must be 6 urls for a cubemap";var g=c.format||a.RGBA,h=c.type||a.UNSIGNED_BYTE,i=c.target||a.TEXTURE_2D;if(i!==a.TEXTURE_CUBE_MAP)throw"target must be TEXTURE_CUBE_MAP";P(a,b,c),c=N(c);var j,k=6,l=[],m=L(a,c);j=f.map(function(a,b){return O(a,e(m[b]))})}function S(a){switch(a){case oa:case ra:return 1;case sa:return 2;case pa:return 3;case qa:return 4;default:throw"unknown type: "+a}}function T(a,b){return x(b)?u(b):a.UNSIGNED_BYTE}function U(a,b,c,d){d=d||fa;var e=d.target||a.TEXTURE_2D,f=d.width,g=d.height,h=d.format||a.RGBA,i=d.type||T(a,c),j=S(h),k=c.length/j;if(k%1)throw"length wrong size of format: "+Ga(a,h);if(f||g){if(g){if(!f&&(f=k/g,f%1))throw"can't guess width"}else if(g=k/f,g%1)throw"can't guess height"}else{var l=Math.sqrt(k/(e===a.TEXTURE_CUBE_MAP?6:1));l%1===0?(f=l,g=l):(f=k,g=1)}if(!x(c)){var m=v(a,i);c=new m(c)}if(a.pixelStorei(a.UNPACK_ALIGNMENT,d.unpackAlignment||1),F(a,d),e===a.TEXTURE_CUBE_MAP){var n=k/6*j;M(a,d).forEach(function(b){var d=n*b.ndx,e=c.subarray(d,d+n);a.texImage2D(b.face,0,h,f,g,0,h,i,e)})}else a.texImage2D(e,0,h,f,g,0,h,i,c);return G(a,d),{width:f,height:g}}function V(a,b,c){var d=c.target||a.TEXTURE_2D;a.bindTexture(d,b);var e=c.format||a.RGBA,f=c.type||a.UNSIGNED_BYTE;if(F(a,c),d===a.TEXTURE_CUBE_MAP)for(var g=0;6>g;++g)a.texImage2D(a.TEXTURE_CUBE_MAP_POSITIVE_X+g,0,e,c.width,c.height,0,e,f,null);else a.texImage2D(d,0,e,c.width,c.height,0,e,f,null)}function W(a,b,c){b=b||fa;var d=a.createTexture(),e=b.target||a.TEXTURE_2D,f=b.width||1,g=b.height||1;a.bindTexture(e,d),e===a.TEXTURE_CUBE_MAP&&(a.texParameteri(e,a.TEXTURE_WRAP_S,a.CLAMP_TO_EDGE),a.texParameteri(e,a.TEXTURE_WRAP_T,a.CLAMP_TO_EDGE));var h=b.src;if(h)if("function"==typeof h&&(h=h(a,b)),"string"==typeof h)Q(a,d,b,c);else if(x(h)||Array.isArray(h)&&("number"==typeof h[0]||Array.isArray(h[0])||x(h[0]))){var i=U(a,d,h,b);f=i.width,g=i.height}else if(Array.isArray(h)&&"string"==typeof h[0])R(a,d,b,c);else{if(!(h instanceof HTMLElement))throw"unsupported src type";Ka(a,d,h,b),f=h.width,g=h.height}else V(a,d,b);return b.auto!==!1&&K(a,d,b,f,g),H(a,d,b),d}function X(a,b,c,d,e){d=d||c.width,e=e||c.height;var f=c.target||a.TEXTURE_2D;a.bindTexture(f,b);var g,h=c.format||a.RGBA,i=c.src;if(g=i&&(x(i)||Array.isArray(i)&&"number"==typeof i[0])?c.type||T(a,i):c.type||a.UNSIGNED_BYTE,f===a.TEXTURE_CUBE_MAP)for(var j=0;6>j;++j)a.texImage2D(a.TEXTURE_CUBE_MAP_POSITIVE_X+j,0,h,d,e,0,h,g,null);else a.texImage2D(f,0,h,d,e,0,h,g,null)}function Y(a){return"string"==typeof a||Array.isArray(a)&&"string"==typeof a[0]}function Z(a,b,c){function d(){0===f&&c&&setTimeout(function(){c(g.length?g:void 0,b)},0)}function e(a){--f,a&&g.push(a),d()}var f=0,g=[],h={};return Object.keys(b).forEach(function(c){var d=b[c],g=void 0;Y(d.src)&&(g=e,++f),h[c]=W(a,d,g)}),d(),h}function $(a){return Ma[a]}function _(a){return Na[a]}function aa(a,b,c,d){var e=a.FRAMEBUFFER,f=a.createFramebuffer();a.bindFramebuffer(e,f),c=c||a.drawingBufferWidth,d=d||a.drawingBufferHeight,b=b||La;var g=0,h={framebuffer:f,attachments:[]};return b.forEach(function(b){var f=b.attachment,i=b.format,j=$(i);if(j||(j=Aa+g++),!f)if(_(i))f=a.createRenderbuffer(),a.bindRenderbuffer(a.RENDERBUFFER,f),a.renderbufferStorage(a.RENDERBUFFER,i,c,d);else{var k=N(b);k.width=c,k.height=d,k.auto=void 0===b.auto?!1:b.auto,f=W(a,k)}if(f instanceof WebGLRenderbuffer)a.framebufferRenderbuffer(e,j,a.RENDERBUFFER,f);else{if(!(f instanceof WebGLTexture))throw"unknown attachment type";a.framebufferTexture2D(e,j,b.texTarget||a.TEXTURE_2D,f,b.level||0)}h.attachments.push(f)}),h}function ba(a,b,c,d,e){d=d||a.drawingBufferWidth,e=e||a.drawingBufferHeight,c=c||La,c.forEach(function(c,f){var g=b.attachments[f],h=c.format;if(g instanceof WebGLRenderbuffer)a.bindRenderbuffer(a.RENDERBUFFER,g),a.renderbufferStorage(a.RENDERBUFFER,h,d,e);else{if(!(g instanceof WebGLTexture))throw"unknown attachment type";X(a,g,c,d,e)}})}var ca=window.console&&window.console.error?window.console.error.bind(window.console):function(){},da="",ea=new Uint8Array([128,192,255,255]),fa={},ga=5120,ha=5121,ia=5122,ja=5123,ka=5124,la=5125,ma=5126,na=6402,oa=6406,pa=6407,qa=6408,ra=6409,sa=6410,ta=32854,ua=32855,va=36194,wa=33189,xa=6401,ya=36168,za=34041,Aa=36064,Ba=36096,Ca=36128,Da=33306,Ea=33071,Fa=9729,Ga=function(){function a(a){b||(b={},Object.keys(a).forEach(function(c){"number"==typeof a[c]&&(b[a[c]]=c)}))}var b;return function(c,d){return a(),b[d]||"0x"+d.toString(16)}}(),Ha=["VERTEX_SHADER","FRAGMENT_SHADER"],Ia=function(){var a=["position","positions","a_position"];return function(b){for(var c,d=0;d<a.length&&(c=a[d],!(c in b));++d);d===a.length&&(c=Object.keys(b)[0]);var e=b[c],f=e.length||e.data.length,g=e.numComponents||y(c,f),h=f/g;if(f%g>0)throw"numComponents "+g+" not correct for length "+f;return h}}(),Ja={},Ka=function(){var a=document.createElement("canvas").getContext("2d");return function(b,c,d,e){e=e||fa;var f=e.target||b.TEXTURE_2D,g=d.width,h=d.height,i=e.format||b.RGBA,j=e.type||b.UNSIGNED_BYTE;if(F(b,e),b.bindTexture(f,c),f===b.TEXTURE_CUBE_MAP){var k,l,m=d.width,n=d.height;if(m/6===n)k=n,l=[0,0,1,0,2,0,3,0,4,0,5,0];else if(n/6===m)k=m,l=[0,0,0,1,0,2,0,3,0,4,0,5];else if(m/3===n/2)k=m/3,l=[0,0,1,0,2,0,0,1,1,1,2,1];else{if(m/2!==n/3)throw"can't figure out cube map from element: "+(d.src?d.src:d.nodeName);k=m/2,l=[0,0,1,0,0,1,1,1,0,2,1,2]}a.canvas.width=k,a.canvas.height=k,g=k,h=k,M(b,e).forEach(function(c){var e=l[2*c.ndx+0]*k,f=l[2*c.ndx+1]*k;a.drawImage(d,e,f,k,k,0,0,k,k),b.texImage2D(c.face,0,i,i,j,a.canvas)}),a.canvas.width=1,a.canvas.height=1}else b.texImage2D(f,0,i,i,j,d);G(b,e),e.auto!==!1&&K(b,c,e,g,h),H(b,c,e)}}(),La=[{format:qa,type:ha,min:Fa,wrap:Ea},{format:za}],Ma={};Ma[za]=Da,Ma[xa]=Ca,Ma[ya]=Ca,Ma[na]=Ba,Ma[wa]=Ba;var Na={};return Na[ta]=!0,Na[ua]=!0,Na[va]=!0,Na[za]=!0,Na[wa]=!0,Na[xa]=!0,Na[ya]=!0,{createAttribsFromArrays:A,createBuffersFromArrays:C,createBufferInfoFromArrays:B,createAttributeSetters:n,createProgram:g,createProgramFromScripts:i,createProgramFromSources:j,createProgramInfo:q,createUniformSetters:l,drawBufferInfo:D,drawObjectList:E,getWebGLContext:d,resizeCanvasToDisplaySize:r,setAttributes:o,setAttributePrefix:b,setBuffersAndAttributes:p,setUniforms:m,createTexture:W,setEmptyTexture:V,setTextureFromArray:U,loadTextureFromUrl:Q,setTextureFromElement:Ka,setTextureFilteringForSize:K,setTextureParameters:H,setDefaultTextureColor:a,createTextures:Z,resizeTexture:X,createFramebufferInfo:aa,resizeFramebufferInfo:ba}}),c("twgl/v3",[],function(){function a(a){q=a}function b(){return new q(3)}function c(a,b,c){return c=c||new q(3),c[0]=a[0]+b[0],c[1]=a[1]+b[1],c[2]=a[2]+b[2],c}function d(a,b,c){return c=c||new q(3),c[0]=a[0]-b[0],c[1]=a[1]-b[1],c[2]=a[2]-b[2],c}function e(a,b,c,d){return d=d||new q(3),d[0]=(1-c)*a[0]+c*b[0],d[1]=(1-c)*a[1]+c*b[1],d[2]=(1-c)*a[2]+c*b[2],d}function f(a,b,c){return c=c||new q(3),c[0]=a[0]*b,c[1]=a[1]*b,c[2]=a[2]*b,c}function g(a,b,c){return c=c||new q(3),c[0]=a[0]/b,c[1]=a[1]/b,c[2]=a[2]/b,c}function h(a,b,c){return c=c||new q(3),c[0]=a[1]*b[2]-a[2]*b[1],c[1]=a[2]*b[0]-a[0]*b[2],c[2]=a[0]*b[1]-a[1]*b[0],c}function i(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]}function j(a){return Math.sqrt(a[0]*a[0]+a[1]*a[1]+a[2]*a[2])}function k(a){return a[0]*a[0]+a[1]*a[1]+a[2]*a[2]}function l(a,b){b=b||new q(3);var c=a[0]*a[0]+a[1]*a[1]+a[2]*a[2],d=Math.sqrt(c);return d>1e-5?(b[0]=a[0]/d,b[1]=a[1]/d,b[2]=a[2]/d):(b[0]=0,b[1]=0,b[2]=0),b}function m(a,b){return b=b||new q(3),b[0]=-a[0],b[1]=-a[1],b[2]=-a[2],b}function n(a,b){return b=b||new q(3),b[0]=a[0],b[1]=a[1],b[2]=a[2],b}function o(a,b,c){return c=c||new q(3),c[0]=a[0]*b[0],c[1]=a[1]*b[1],c[2]=a[2]*b[2],c}function p(a,b,c){return c=c||new q(3),c[0]=a[0]/b[0],c[1]=a[1]/b[1],c[2]=a[2]/b[2],c}var q=Float32Array;return{add:c,copy:n,create:b,cross:h,divide:p,divScalar:g,dot:i,lerp:e,length:j,lengthSq:k,mulScalar:f,multiply:o,negate:m,normalize:l,setDefaultType:a,subtract:d}}),c("twgl/m4",["./v3"],function(a){function b(a){VecType=a}function c(a,b){return b=b||new E(16),b[0]=-a[0],b[1]=-a[1],b[2]=-a[2],b[3]=-a[3],b[4]=-a[4],b[5]=-a[5],b[6]=-a[6],b[7]=-a[7],b[8]=-a[8],b[9]=-a[9],b[10]=-a[10],b[11]=-a[11],b[12]=-a[12],b[13]=-a[13],b[14]=-a[14],b[15]=-a[15],b}function d(a,b){return b=b||new E(16),b[0]=a[0],b[1]=a[1],b[2]=a[2],b[3]=a[3],b[4]=a[4],b[5]=a[5],b[6]=a[6],b[7]=a[7],b[8]=a[8],b[9]=a[9],b[10]=a[10],b[11]=a[11],b[12]=a[12],b[13]=a[13],b[14]=a[14],b[15]=a[15],b}function e(a){return a=a||new E(16),a[0]=1,a[1]=0,a[2]=0,a[3]=0,a[4]=0,a[5]=1,a[6]=0,a[7]=0,a[8]=0,a[9]=0,a[10]=1,a[11]=0,a[12]=0,a[13]=0,a[14]=0,a[15]=1,a}function f(a,b){if(b=b||new E(16),b===a){var c;return c=a[1],a[1]=a[4],a[4]=c,c=a[2],a[2]=a[8],a[8]=c,c=a[3],a[3]=a[12],a[12]=c,c=a[6],a[6]=a[9],a[9]=c,c=a[7],a[7]=a[13],a[13]=c,c=a[11],a[11]=a[14],a[14]=c,b}var d=a[0],e=a[1],f=a[2],g=a[3],h=a[4],i=a[5],j=a[6],k=a[7],l=a[8],m=a[9],n=a[10],o=a[11],p=a[12],q=a[13],r=a[14],s=a[15];return b[0]=d,b[1]=h,b[2]=l,b[3]=p,b[4]=e,b[5]=i,b[6]=m,b[7]=q,b[8]=f,b[9]=j,b[10]=n,b[11]=r,b[12]=g,b[13]=k,b[14]=o,b[15]=s,b}function g(a,b){b=b||new E(16);var c=a[0],d=a[1],e=a[2],f=a[3],g=a[4],h=a[5],i=a[6],j=a[7],k=a[8],l=a[9],m=a[10],n=a[11],o=a[12],p=a[13],q=a[14],r=a[15],s=m*r,t=q*n,u=i*r,v=q*j,w=i*n,x=m*j,y=e*r,z=q*f,A=e*n,B=m*f,C=e*j,D=i*f,F=k*p,G=o*l,H=g*p,I=o*h,J=g*l,K=k*h,L=c*p,M=o*d,N=c*l,O=k*d,P=c*h,Q=g*d,R=s*h+v*l+w*p-(t*h+u*l+x*p),S=t*d+y*l+B*p-(s*d+z*l+A*p),T=u*d+z*h+C*p-(v*d+y*h+D*p),U=x*d+A*h+D*l-(w*d+B*h+C*l),V=1/(c*R+g*S+k*T+o*U);return b[0]=V*R,b[1]=V*S,b[2]=V*T,b[3]=V*U,b[4]=V*(t*g+u*k+x*o-(s*g+v*k+w*o)),b[5]=V*(s*c+z*k+A*o-(t*c+y*k+B*o)),b[6]=V*(v*c+y*g+D*o-(u*c+z*g+C*o)),b[7]=V*(w*c+B*g+C*k-(x*c+A*g+D*k)),b[8]=V*(F*j+I*n+J*r-(G*j+H*n+K*r)),b[9]=V*(G*f+L*n+O*r-(F*f+M*n+N*r)),b[10]=V*(H*f+M*j+P*r-(I*f+L*j+Q*r)),b[11]=V*(K*f+N*j+Q*n-(J*f+O*j+P*n)),b[12]=V*(H*m+K*q+G*i-(J*q+F*i+I*m)),b[13]=V*(N*q+F*e+M*m-(L*m+O*q+G*e)),b[14]=V*(L*i+Q*q+I*e-(P*q+H*e+M*i)),b[15]=V*(P*m+J*e+O*i-(N*i+Q*m+K*e)),b}function h(a,b,c){c=c||new E(16);var d=a[0],e=a[1],f=a[2],g=a[3],h=a[4],i=a[5],j=a[6],k=a[7],l=a[8],m=a[9],n=a[10],o=a[11],p=a[12],q=a[13],r=a[14],s=a[15],t=b[0],u=b[1],v=b[2],w=b[3],x=b[4],y=b[5],z=b[6],A=b[7],B=b[8],C=b[9],D=b[10],F=b[11],G=b[12],H=b[13],I=b[14],J=b[15];return c[0]=d*t+e*x+f*B+g*G,c[1]=d*u+e*y+f*C+g*H,c[2]=d*v+e*z+f*D+g*I,c[3]=d*w+e*A+f*F+g*J,c[4]=h*t+i*x+j*B+k*G,c[5]=h*u+i*y+j*C+k*H,c[6]=h*v+i*z+j*D+k*I,c[7]=h*w+i*A+j*F+k*J,c[8]=l*t+m*x+n*B+o*G,c[9]=l*u+m*y+n*C+o*H,c[10]=l*v+m*z+n*D+o*I,c[11]=l*w+m*A+n*F+o*J,c[12]=p*t+q*x+r*B+s*G,c[13]=p*u+q*y+r*C+s*H,c[14]=p*v+q*z+r*D+s*I,c[15]=p*w+q*A+r*F+s*J,c}function i(a,b,c){return c=c||e(),a!==c&&(c[0]=a[0],c[1]=a[1],c[2]=a[2],c[3]=a[3],c[4]=a[4],c[5]=a[5],c[6]=a[6],c[7]=a[7],c[8]=a[8],c[9]=a[9],c[10]=a[10],c[11]=a[11]),c[12]=b[0],c[13]=b[1],c[14]=b[2],c[15]=1,c}function j(b,c){return c=c||a.create(),c[0]=b[12],c[1]=b[13],c[2]=b[14],c}function k(b,c,d){d=d||a.create();var e=4*c;return d[0]=b[e+0],d[1]=b[e+1],d[2]=b[e+2],d}function l(a,b,c,d,e){e=e||new E(16);var f=Math.tan(.5*Math.PI-.5*a),g=1/(c-d);return e[0]=f/b,e[1]=0,e[2]=0,e[3]=0,e[4]=0,e[5]=f,e[6]=0,e[7]=0,e[8]=0,e[9]=0,e[10]=(c+d)*g,e[11]=-1,e[12]=0,e[13]=0,e[14]=c*d*g*2,e[15]=0,e}function m(a,b,c,d,e,f,g){return g=g||new E(16),g[0]=2/(b-a),g[1]=0,g[2]=0,g[3]=0,g[4]=0,g[5]=2/(d-c),g[6]=0,g[7]=0,g[8]=0,g[9]=0,g[10]=-1/(f-e),g[11]=0,g[12]=(b+a)/(a-b),g[13]=(d+c)/(c-d),g[14]=-e/(e-f),g[15]=1,g}function n(a,b,c,d,e,f,g){g=g||new E(16);var h=b-a,i=d-c,j=e-f;return g[0]=2*e/h,g[1]=0,g[2]=0,g[3]=0,g[4]=0,g[5]=2*e/i,g[6]=0,g[7]=0,g[8]=(a+b)/h,g[9]=(d+c)/i,g[10]=f/j,g[11]=-1,g[12]=0,g[13]=0,g[14]=e*f/j,g[15]=0,g}function o(b,c,d,e){e=e||new E(16);var f=F,g=G,h=H;return a.normalize(a.subtract(b,c,h),h),a.normalize(a.cross(d,h,f),f),a.normalize(a.cross(h,f,g),g),e[0]=f[0],e[1]=f[1],e[2]=f[2],e[3]=0,e[4]=g[0],e[5]=g[1],e[6]=g[2],e[7]=0,e[8]=h[0],e[9]=h[1],e[10]=h[2],e[11]=0,e[12]=b[0],e[13]=b[1],e[14]=b[2],e[15]=1,e}function p(a,b){return b=b||new E(16),b[0]=1,b[1]=0,b[2]=0,b[3]=0,b[4]=0,b[5]=1,b[6]=0,b[7]=0,b[8]=0,b[9]=0,b[10]=1,b[11]=0,b[12]=a[0],b[13]=a[1],b[14]=a[2],b[15]=1,b}function q(a,b,c){c=c||new E(16);var d=b[0],e=b[1],f=b[2],g=a[0],h=a[1],i=a[2],j=a[3],k=a[4],l=a[5],m=a[6],n=a[7],o=a[8],p=a[9],q=a[10],r=a[11],s=a[12],t=a[13],u=a[14],v=a[15];return a!==c&&(c[0]=g,c[1]=h,c[2]=i,c[3]=j,c[4]=k,c[5]=l,c[6]=m,c[7]=n,c[8]=o,c[9]=p,c[10]=q,c[11]=r),c[12]=g*d+k*e+o*f+s,c[13]=h*d+l*e+p*f+t,c[14]=i*d+m*e+q*f+u,c[15]=j*d+n*e+r*f+v,c}function r(a,b){b=b||new E(16);var c=Math.cos(a),d=Math.sin(a);return b[0]=1,b[1]=0,b[2]=0,b[3]=0,b[4]=0,b[5]=c,b[6]=d,b[7]=0,b[8]=0,b[9]=-d,b[10]=c,b[11]=0,b[12]=0,b[13]=0,b[14]=0,b[15]=1,b}function s(a,b,c){c=c||new E(16);var d=a[4],e=a[5],f=a[6],g=a[7],h=a[8],i=a[9],j=a[10],k=a[11],l=Math.cos(b),m=Math.sin(b);return c[4]=l*d+m*h,c[5]=l*e+m*i,c[6]=l*f+m*j,c[7]=l*g+m*k,c[8]=l*h-m*d,c[9]=l*i-m*e,c[10]=l*j-m*f,c[11]=l*k-m*g,a!==c&&(c[0]=a[0],c[1]=a[1],c[2]=a[2],c[3]=a[3],c[12]=a[12],c[13]=a[13],c[14]=a[14],c[15]=a[15]),c}function t(a,b){b=b||new E(16);var c=Math.cos(a),d=Math.sin(a);return b[0]=c,b[1]=0,b[2]=-d,b[3]=0,b[4]=0,b[5]=1,b[6]=0,b[7]=0,b[8]=d,b[9]=0,b[10]=c,b[11]=0,b[12]=0,b[13]=0,b[14]=0,b[15]=1,b}function u(a,b,c){c=c||new E(16);var d=a[0],e=a[1],f=a[2],g=a[3],h=a[8],i=a[9],j=a[10],k=a[11],l=Math.cos(b),m=Math.sin(b);return c[0]=l*d-m*h,c[1]=l*e-m*i,c[2]=l*f-m*j,c[3]=l*g-m*k,c[8]=l*h+m*d,c[9]=l*i+m*e,c[10]=l*j+m*f,c[11]=l*k+m*g,a!==c&&(c[4]=a[4],c[5]=a[5],c[6]=a[6],c[7]=a[7],c[12]=a[12],c[13]=a[13],c[14]=a[14],c[15]=a[15]),c}function v(a,b){b=b||new E(16);var c=Math.cos(a),d=Math.sin(a);return b[0]=c,b[1]=d,b[2]=0,b[3]=0,b[4]=-d,b[5]=c,b[6]=0,b[7]=0,b[8]=0,b[9]=0,b[10]=1,b[11]=0,b[12]=0,b[13]=0,b[14]=0,b[15]=1,b}function w(a,b,c){c=c||new E(16);var d=a[0],e=a[1],f=a[2],g=a[3],h=a[4],i=a[5],j=a[6],k=a[7],l=Math.cos(b),m=Math.sin(b);return c[0]=l*d+m*h,c[1]=l*e+m*i,c[2]=l*f+m*j,c[3]=l*g+m*k,c[4]=l*h-m*d,c[5]=l*i-m*e,c[6]=l*j-m*f,c[7]=l*k-m*g,a!==c&&(c[8]=a[8],c[9]=a[9],c[10]=a[10],c[11]=a[11],c[12]=a[12],c[13]=a[13],c[14]=a[14],c[15]=a[15]),c}function x(a,b,c){c=c||new E(16);var d=a[0],e=a[1],f=a[2],g=Math.sqrt(d*d+e*e+f*f);d/=g,e/=g,f/=g;var h=d*d,i=e*e,j=f*f,k=Math.cos(b),l=Math.sin(b),m=1-k;return c[0]=h+(1-h)*k,c[1]=d*e*m+f*l,c[2]=d*f*m-e*l,c[3]=0,c[4]=d*e*m-f*l,c[5]=i+(1-i)*k,c[6]=e*f*m+d*l,c[7]=0,c[8]=d*f*m+e*l,c[9]=e*f*m-d*l,c[10]=j+(1-j)*k,c[11]=0,c[12]=0,c[13]=0,c[14]=0,c[15]=1,c}function y(a,b,c,d){d=d||new E(16);var e=b[0],f=b[1],g=b[2],h=Math.sqrt(e*e+f*f+g*g);e/=h,f/=h,g/=h;var i=e*e,j=f*f,k=g*g,l=Math.cos(c),m=Math.sin(c),n=1-l,o=i+(1-i)*l,p=e*f*n+g*m,q=e*g*n-f*m,r=e*f*n-g*m,s=j+(1-j)*l,t=f*g*n+e*m,u=e*g*n+f*m,v=f*g*n-e*m,w=k+(1-k)*l,x=a[0],y=a[1],z=a[2],A=a[3],B=a[4],C=a[5],D=a[6],F=a[7],G=a[8],H=a[9],I=a[10],J=a[11];return d[0]=o*x+p*B+q*G,d[1]=o*y+p*C+q*H,d[2]=o*z+p*D+q*I,d[3]=o*A+p*F+q*J,d[4]=r*x+s*B+t*G,d[5]=r*y+s*C+t*H,d[6]=r*z+s*D+t*I,d[7]=r*A+s*F+t*J,d[8]=u*x+v*B+w*G,d[9]=u*y+v*C+w*H,d[10]=u*z+v*D+w*I,d[11]=u*A+v*F+w*J,a!==d&&(d[12]=a[12],d[13]=a[13],d[14]=a[14],d[15]=a[15]),d}function z(a,b){return b=b||new E(16),b[0]=a[0],b[1]=0,b[2]=0,b[3]=0,b[4]=0,b[5]=a[1],b[6]=0,b[7]=0,b[8]=0,b[9]=0,b[10]=a[2],b[11]=0,b[12]=0,b[13]=0,b[14]=0,b[15]=1,b}function A(a,b,c){c=c||new E(16);var d=b[0],e=b[1],f=b[2];return c[0]=d*a[0],c[1]=d*a[1],c[2]=d*a[2],c[3]=d*a[3],c[4]=e*a[4],c[5]=e*a[5],c[6]=e*a[6],c[7]=e*a[7],c[8]=f*a[8],c[9]=f*a[9],c[10]=f*a[10],c[11]=f*a[11],a!==c&&(c[12]=a[12],c[13]=a[13],c[14]=a[14],c[15]=a[15]),a}function B(b,c,d){d=d||a.create();var e=c[0],f=c[1],g=c[2],h=e*b[3]+f*b[7]+g*b[11]+b[15];return d[0]=(e*b[0]+f*b[4]+g*b[8]+b[12])/h,d[1]=(e*b[1]+f*b[5]+g*b[9]+b[13])/h,d[2]=(e*b[2]+f*b[6]+g*b[10]+b[14])/h,d}function C(b,c,d){d=d||a.create();var e=c[0],f=c[1],g=c[2];return d[0]=e*b[0]+f*b[4]+g*b[8],d[1]=e*b[1]+f*b[5]+g*b[9],d[2]=e*b[2]+f*b[6]+g*b[10],d}function D(b,c,d){d=d||a.create();var e=g(b),f=c[0],h=c[1],i=c[2];return d[0]=f*e[0]+h*e[1]+i*e[2],d[1]=f*e[4]+h*e[5]+i*e[6],d[2]=f*e[8]+h*e[9]+i*e[10],d}var E=Float32Array,F=a.create(),G=a.create(),H=a.create();return{axisRotate:y,axisRotation:x,create:e,copy:d,frustum:n,getAxis:k,getTranslation:j,identity:e,inverse:g,lookAt:o,multiply:h,negate:c,ortho:m,perspective:l,rotateX:s,rotateY:u,rotateZ:w,rotationX:r,rotationY:t,rotationZ:v,scale:A,scaling:z,setDefaultType:b,setTranslation:i,transformDirection:C,transformNormal:D,transformPoint:B,translate:q,translation:p,transpose:f}}),c("twgl/primitives",["./twgl","./m4","./v3"],function(a,b,c){function d(a,b){var c=0;return a.push=function(){for(var b=0;b<arguments.length;++b){var d=arguments[b];if(d instanceof Array||d.buffer&&d.buffer instanceof ArrayBuffer)for(var e=0;e<d.length;++e)a[c++]=d[e];else a[c++]=d}},a.reset=function(a){c=a||0},a.numComponents=b,Object.defineProperty(a,"numElements",{get:function(){return this.length/this.numComponents|0}}),a}function e(a,b,c){var e=c||Float32Array;return d(new e(a*b),a)}function f(a){return"indices"!==a}function g(a){function b(b){for(var f=a[b],h=f.numComponents,i=e(h,g,f.constructor),j=0;g>j;++j)for(var k=c[j],l=k*h,m=0;h>m;++m)i.push(f[l+m]);d[b]=i}var c=a.indices,d={},g=c.length;return Object.keys(a).filter(f).forEach(b),d}function h(a){if(a.indices)throw"can't flatten normals of indexed vertices. deindex them first";for(var b=a.normal,c=b.length,d=0;c>d;d+=9){var e=b[d+0],f=b[d+1],g=b[d+2],h=b[d+3],i=b[d+4],j=b[d+5],k=b[d+6],l=b[d+7],m=b[d+8],n=e+h+k,o=f+i+l,p=g+j+m,q=Math.sqrt(n*n+o*o+p*p);n/=q,o/=q,p/=q,b[d+0]=n,b[d+1]=o,b[d+2]=p,b[d+3]=n,b[d+4]=o,b[d+5]=p,b[d+6]=n,b[d+7]=o,b[d+8]=p}return a}function i(a,b,c){for(var d=a.length,e=new Float32Array(3),f=0;d>f;f+=3)c(b,[a[f],a[f+1],a[f+2]],e),a[f]=e[0],a[f+1]=e[1],a[f+2]=e[2]}function j(a,b,d){d=d||c.create();var e=b[0],f=b[1],g=b[2];return d[0]=e*a[0]+f*a[1]+g*a[2],d[1]=e*a[4]+f*a[5]+g*a[6],d[2]=e*a[8]+f*a[9]+g*a[10],d}function k(a,c){return i(a,c,b.transformDirection),a}function l(a,c){return i(a,b.inverse(c),j),a}function m(a,c){return i(a,c,b.transformPoint),a}function n(a,b){return Object.keys(a).forEach(function(c){var d=a[c];c.indexOf("pos")>=0?m(d,b):c.indexOf("tan")>=0||c.indexOf("binorm")>=0?k(d,b):c.indexOf("norm")>=0&&l(d,b)}),a}function o(a,b,c){return a=a||2,b=b||0,c=c||0,a*=.5,{position:{numComponents:2,data:[b+-1*a,c+-1*a,b+1*a,c+-1*a,b+-1*a,c+1*a,b+1*a,c+1*a]},normal:[0,0,1,0,0,1,0,0,1,0,0,1],texcoord:[0,0,1,0,0,1,1,1],indices:[0,1,2,2,1,3]}}function p(a,c,d,f,g){a=a||1,c=c||1,d=d||1,f=f||1,g=g||b.identity();for(var h=(d+1)*(f+1),i=e(3,h),j=e(3,h),k=e(2,h),l=0;f>=l;l++)for(var m=0;d>=m;m++){var o=m/d,p=l/f;i.push(a*o-.5*a,0,c*p-.5*c),j.push(0,1,0),k.push(o,p)}for(var q=d+1,r=e(3,d*f*2,Uint16Array),l=0;f>l;l++)for(var m=0;d>m;m++)r.push((l+0)*q+m,(l+1)*q+m,(l+0)*q+m+1),r.push((l+1)*q+m,(l+1)*q+m+1,(l+0)*q+m+1);var s=n({position:i,normal:j,texcoord:k,indices:r},g);return s}function q(a,b,c,d,f,g,h){if(0>=b||0>=c)throw Error("subdivisionAxis and subdivisionHeight must be > 0");d=d||0,f=f||Math.PI,g=g||0,h=h||2*Math.PI;for(var i=f-d,j=h-g,k=(b+1)*(c+1),l=e(3,k),m=e(3,k),n=e(2,k),o=0;c>=o;o++)for(var p=0;b>=p;p++){var q=p/b,r=o/c,s=j*q,t=i*r,u=Math.sin(s),v=Math.cos(s),w=Math.sin(t),x=Math.cos(t),y=v*w,z=x,A=u*w;l.push(a*y,a*z,a*A),m.push(y,z,A),n.push(1-q,r)}for(var B=b+1,C=e(3,b*c*2,Uint16Array),p=0;b>p;p++)for(var o=0;c>o;o++)C.push((o+0)*B+p,(o+0)*B+p+1,(o+1)*B+p),C.push((o+1)*B+p,(o+0)*B+p+1,(o+1)*B+p+1);return{position:l,normal:m,texcoord:n,indices:C}}function r(a){a=a||1;for(var b=a/2,c=[[-b,-b,-b],[+b,-b,-b],[-b,+b,-b],[+b,+b,-b],[-b,-b,+b],[+b,-b,+b],[-b,+b,+b],[+b,+b,+b]],d=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]],f=[[1,0],[0,0],[0,1],[1,1]],g=24,h=e(3,g),i=e(3,g),j=e(2,g),k=e(3,12,Uint16Array),l=0;6>l;++l){
for(var m=D[l],n=0;4>n;++n){var o=c[m[n]],p=d[l],q=f[n];h.push(o),i.push(p),j.push(q)}var r=4*l;k.push(r+0,r+1,r+2),k.push(r+0,r+2,r+3)}return{position:h,normal:i,texcoord:j,indices:k}}function s(a,b,c,d,f,g,h){if(3>d)throw Error("radialSubdivisions must be 3 or greater");if(1>f)throw Error("verticalSubdivisions must be 1 or greater");for(var i=void 0===g?!0:g,j=void 0===h?!0:h,k=(i?2:0)+(j?2:0),l=(d+1)*(f+1+k),m=e(3,l),n=e(3,l),o=e(2,l),p=e(3,d*(f+k)*2,Uint16Array),q=d+1,r=Math.atan2(a-b,c),s=Math.cos(r),t=Math.sin(r),u=i?-2:0,v=f+(j?2:0),w=u;v>=w;++w){var x,y=w/f,z=c*y;0>w?(z=0,y=1,x=a):w>f?(z=c,y=1,x=b):x=a+(b-a)*(w/f),(-2===w||w===f+2)&&(x=0,y=0),z-=c/2;for(var A=0;q>A;++A){var B=Math.sin(A*Math.PI*2/d),C=Math.cos(A*Math.PI*2/d);m.push(B*x,z,C*x),n.push(0>w||w>f?0:B*s,0>w?-1:w>f?1:t,0>w||w>f?0:C*s),o.push(A/d,1-y)}}for(var w=0;f+k>w;++w)for(var A=0;d>A;++A)p.push(q*(w+0)+0+A,q*(w+0)+1+A,q*(w+1)+1+A),p.push(q*(w+0)+0+A,q*(w+1)+1+A,q*(w+1)+0+A);return{position:m,normal:n,texcoord:o,indices:p}}function t(a,b){b=b||[];for(var c=[],d=0;d<a.length;d+=4){var e=a[d],f=a.slice(d+1,d+4);f.push.apply(f,b);for(var g=0;e>g;++g)c.push.apply(c,f)}return c}function u(){var a=[0,0,0,0,150,0,30,0,0,0,150,0,30,150,0,30,0,0,30,0,0,30,30,0,100,0,0,30,30,0,100,30,0,100,0,0,30,60,0,30,90,0,67,60,0,30,90,0,67,90,0,67,60,0,0,0,30,30,0,30,0,150,30,0,150,30,30,0,30,30,150,30,30,0,30,100,0,30,30,30,30,30,30,30,100,0,30,100,30,30,30,60,30,67,60,30,30,90,30,30,90,30,67,60,30,67,90,30,0,0,0,100,0,0,100,0,30,0,0,0,100,0,30,0,0,30,100,0,0,100,30,0,100,30,30,100,0,0,100,30,30,100,0,30,30,30,0,30,30,30,100,30,30,30,30,0,100,30,30,100,30,0,30,30,0,30,60,30,30,30,30,30,30,0,30,60,0,30,60,30,30,60,0,67,60,30,30,60,30,30,60,0,67,60,0,67,60,30,67,60,0,67,90,30,67,60,30,67,60,0,67,90,0,67,90,30,30,90,0,30,90,30,67,90,30,30,90,0,67,90,30,67,90,0,30,90,0,30,150,30,30,90,30,30,90,0,30,150,0,30,150,30,0,150,0,0,150,30,30,150,30,0,150,0,30,150,30,30,150,0,0,0,0,0,0,30,0,150,30,0,0,0,0,150,30,0,150,0],b=[.22,.19,.22,.79,.34,.19,.22,.79,.34,.79,.34,.19,.34,.19,.34,.31,.62,.19,.34,.31,.62,.31,.62,.19,.34,.43,.34,.55,.49,.43,.34,.55,.49,.55,.49,.43,0,0,1,0,0,1,0,1,1,0,1,1,0,0,1,0,0,1,0,1,1,0,1,1,0,0,1,0,0,1,0,1,1,0,1,1,0,0,1,0,1,1,0,0,1,1,0,1,0,0,1,0,1,1,0,0,1,1,0,1,0,0,0,1,1,1,0,0,1,1,1,0,0,0,1,1,0,1,0,0,1,0,1,1,0,0,1,1,0,1,0,0,1,0,1,1,0,0,1,1,0,1,0,0,1,0,1,1,0,0,0,1,1,1,0,0,1,1,1,0,0,0,1,1,0,1,0,0,1,0,1,1,0,0,0,1,1,1,0,0,1,1,1,0,0,0,0,1,1,1,0,0,1,1,1,0],c=t([18,0,0,1,18,0,0,-1,6,0,1,0,6,1,0,0,6,0,-1,0,6,1,0,0,6,0,1,0,6,1,0,0,6,0,-1,0,6,1,0,0,6,0,-1,0,6,-1,0,0]),d=t([18,200,70,120,18,80,70,200,6,70,200,210,6,200,200,70,6,210,100,70,6,210,160,70,6,70,180,210,6,100,70,210,6,76,210,100,6,140,210,80,6,90,130,110,6,160,160,220],[255]),f=a.length/3,g={position:e(3,f),texcoord:e(2,f),normal:e(3,f),color:e(4,f,Uint8Array),indices:e(3,f/3,Uint16Array)};g.position.push(a),g.texcoord.push(b),g.normal.push(c),g.color.push(d);for(var h=0;f>h;++h)g.indices.push(h);return g}function v(a,b,d,f,g,h,i){function j(a,b,c){return a+(b-a)*c}function k(b,d,e,i,k,l){for(var o=0;g>=o;o++){var s=d/(m-1),t=o/g,u=2*(s-.5),v=(h+t*n)*Math.PI,w=Math.sin(v),x=Math.cos(v),y=j(a,b,w),z=u*f,A=x*a,B=w*y;p.push(z,A,B);var C=c.add(c.multiply([0,w,x],e),i);q.push(C),r.push(s*k+l,t)}}function l(a,b){for(var c=0;g>c;++c)u.push(a+c+0,a+c+1,b+c+0),u.push(a+c+1,b+c+1,b+c+0)}if(0>=g)throw Error("subdivisionDown must be > 0");h=h||0,i=i||1;for(var m=2,n=i-h,o=2*(g+1)*(2+m),p=e(3,o),q=e(3,o),r=e(2,o),s=0;m>s;s++){var t=2*(s/(m-1)-.5);k(b,s,[1,1,1],[0,0,0],1,0),k(b,s,[0,0,0],[t,0,0],0,0),k(d,s,[1,1,1],[0,0,0],1,0),k(d,s,[0,0,0],[t,0,0],0,1)}var u=e(3,2*g*(2+m),Uint16Array),v=g+1;return l(0*v,4*v),l(5*v,7*v),l(6*v,2*v),l(3*v,1*v),{position:p,normal:q,texcoord:r,indices:u}}function w(a,b,c,d,e,f){return s(a,a,b,c,d,e,f)}function x(a,b,c,d,f,g){if(3>c)throw Error("radialSubdivisions must be 3 or greater");if(3>d)throw Error("verticalSubdivisions must be 3 or greater");f=f||0,g=g||2*Math.PI,range=g-f;for(var h=c+1,i=d+1,j=h*i,k=e(3,j),l=e(3,j),m=e(2,j),n=e(3,c*d*2,Uint16Array),o=0;i>o;++o)for(var p=o/d,q=p*Math.PI*2,r=Math.sin(q),s=a+r*b,t=Math.cos(q),u=t*b,v=0;h>v;++v){var w=v/c,x=f+w*range,y=Math.sin(x),z=Math.cos(x),A=y*s,B=z*s,C=y*r,D=z*r;k.push(A,u,B),l.push(C,t,D),m.push(w,1-p)}for(var o=0;d>o;++o)for(var v=0;c>v;++v){var E=1+v,F=1+o;n.push(h*o+v,h*F+v,h*o+E),n.push(h*F+v,h*F+E,h*o+E)}return{position:k,normal:l,texcoord:m,indices:n}}function y(a,b,c,d,f){if(3>b)throw Error("divisions must be at least 3");c=c?c:1,f=f?f:1,d=d?d:0;for(var g=(b+1)*(c+1),h=e(3,g),i=e(3,g),j=e(2,g),k=e(3,c*b*2,Uint16Array),l=0,m=a-d,n=0;c>=n;++n){for(var o=d+m*Math.pow(n/c,f),p=0;b>=p;++p){var q=2*Math.PI*p/b,r=o*Math.cos(q),s=o*Math.sin(q);if(h.push(r,0,s),i.push(0,1,0),j.push(1-p/b,n/c),n>0&&p!==b){var t=l+(p+1),u=l+p,v=l+p-b,w=l+(p+1)-b;k.push(t,u,v),k.push(t,v,w)}}l+=b+1}return{position:h,normal:i,texcoord:j,indices:k}}function z(a){return Math.random()*a|0}function A(a,b){b=b||{};var c=a.position.numElements,d=e(4,c,Uint8Array),f=b.rand||function(a,b){return 3>b?z(256):255};if(a.color=d,a.indices)for(var g=0;c>g;++g)d.push(f(g,0),f(g,1),f(g,2),f(g,3));else for(var h=b.vertsPerColor||3,i=c/h,g=0;i>g;++g)for(var j=[f(g,0),f(g,1),f(g,2),f(g,3)],k=0;h>k;++k)d.push(j);return a}function B(b){return function(c){var d=b.apply(this,Array.prototype.slice.call(arguments,1));return a.createBuffersFromArrays(c,d)}}function C(b){return function(c){var d=b.apply(null,Array.prototype.slice.call(arguments,1));return a.createBufferInfoFromArrays(c,d)}}var D=[[3,7,5,1],[6,2,0,4],[6,7,3,2],[0,1,5,4],[7,6,4,5],[2,3,1,0]];return{create3DFBufferInfo:C(u),create3DFBuffers:B(u),create3DFVertices:u,createAugmentedTypedArray:e,createCubeBufferInfo:C(r),createCubeBuffers:B(r),createCubeVertices:r,createPlaneBufferInfo:C(p),createPlaneBuffers:B(p),createPlaneVertices:p,createSphereBufferInfo:C(q),createSphereBuffers:B(q),createSphereVertices:q,createTruncatedConeBufferInfo:C(s),createTruncatedConeBuffers:B(s),createTruncatedConeVertices:s,createXYQuadBufferInfo:C(o),createXYQuadBuffers:B(o),createXYQuadVertices:o,createCresentBufferInfo:C(v),createCresentBuffers:B(v),createCresentVertices:v,createCylinderBufferInfo:C(w),createCylinderBuffers:B(w),createCylinderVertices:w,createTorusBufferInfo:C(x),createTorusBuffers:B(x),createTorusVertices:x,createDiscBufferInfo:C(y),createDiscBuffers:B(y),createDiscVertices:y,deindexVertices:g,flattenNormals:h,makeRandomVertexColors:A,reorientDirections:k,reorientNormals:l,reorientPositions:m,reorientVertices:n}}),c("main",["twgl/twgl","twgl/m4","twgl/v3","twgl/primitives"],function(a,b,c,d){return a.m4=b,a.v3=c,a.primitives=d,a}),b(["main"],function(a){return a},void 0,!0),c("build/js/twgl-includer-full",function(){}),b("main")});
},{}],3:[function(require,module,exports){
var utils = {
    uniqueId: function uniqueId() {
        var r = (Math.random() * 100000000) | 0;
        return Date.now().toString(32) + r.toString(32);
    },

    getCookie: function getCookie(name) {
        var cookies = document.cookie.split(';');
        var nameEQ = name + '=';
        for (var i = 0; i < cookies.length; i++) {
            var c = cookies[i];
            while (c.charAt(0) === ' ') {
                c = c.substring(1, c.length);
            }
            if (c.indexOf(nameEQ) === 0) {
                return c.substring(nameEQ.length, c.length);
            }
        }
        return null;
    },

    encodeQueryParams: function encodeQueryParams(paramsObj) {
        var eUC = encodeURIComponent;
        return Object.keys(paramsObj).map(function(param) {
            return eUC(param) + '=' + eUC(paramsObj[param]);
        }).join('&');
    },

    extend: function extend(target, source, overwrite) {
        for (var key in source)
            if (overwrite || !(key in target)) {
                target[key] = source[key];
            }
        return target;
    },

    onReady: function onReady(fn) {
        if (document.readyState !== 'loading') {
            fn();
        } else {
            document.addEventListener('DOMContentLoaded', fn);
        }
    },

    getJSON: function getJSON(url) {
        return new Promise(function(resolve, reject) {
            var request = new XMLHttpRequest();
            request.open('GET', url, true);
            request.onload = function() {
                if (this.status >= 200 && this.status < 400) {
                    try {
                        resolve(JSON.parse(this.response));
                    } catch (err) {
                        reject(this.response);
                    }
                } else {
                    reject(this.response);
                }
            };
            request.onerror = function() {
                reject(this.response);
            };
            request.send();
        });
    },

    startAnimation: function startAnimation(renderFn, duration) {
        var startTime;
        return new Promise(function(resolve) {
            function _render(t) {
                startTime = startTime || t;
                var step = (t - startTime) / duration;
                renderFn(step);
                if (step < 1) {
                    requestAnimationFrame(_render);
                } else {
                    resolve();
                }
            }
            requestAnimationFrame(_render);
        });
    },

    easeOut: function easeOut(step, start, change) {
        return change * Math.pow(step, 2) + start;
    },

    easeIn: function easeIn(step, start, change) {
        return change * (1 - Math.pow(1 - step, 3)) + start;
    },

    shuffle: function shuffle(list) {
        list = list.slice();
        var shuffled = [];
        while (list.length) {
            var i = Math.random() * list.length | 0;
            shuffled.push(list.splice(i, 1)[0]);
        }
        return shuffled;
    },

    random: function random(low, high) {
        if (Array.isArray(low)) {
            return low[Math.random() * low.length | 0];
        }
        if (high === undefined) {
            high = low;
            low = 0;
        }
        return Math.random() * (high - low) + low;
    },

    // returns an array with ints between start and end (inclusive of start,
    // not inclusive of end). also accepts a single int, treating it as the end
    // and using 0 as start
    range: function range(start, end) {
        if (end === undefined) {
            end = start;
            start = 0;
        }
        var numbers = [];
        while (start < end) {
            numbers.push(start++);
        }
        return numbers;
    }
};

if (module !== undefined) {
    module.exports = utils;
}

},{}]},{},[1]);
