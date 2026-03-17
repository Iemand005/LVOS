 // Sensors
//  Lasse Lauwerys (c) 2026


'use strict';
'use esnext';
'use moz';

/** @type {HTMLCanvasElement} */
var horizon = document.getElementById("horizon");
var ctx = horizon.getContext('2d');

function Graphics(element) {
  /** @type {HTMLCanvasElement?} */
  this.canvas = (
    element instanceof HTMLCanvasElement
    ? element
    : (
      typeof element == "string"
      ? document.getElementById(element)
      : document.createElement("canvas")
    ));
}

/**
 * @param {string | HTMLCanvasElement} elementId 
 */
function Graphics2D(element) {
  Graphics.call(this, element);
  this.ctx = this.canvas.getContext("2d");
}

// Graphics2D.prototype.__proto__ = Graphics.prototype;
// Graphics2D.constru
Graphics2D.prototype = Object.create(Graphics.prototype);
Graphics2D.prototype.constructor = Graphics;

var graphics = new Graphics2D("horizon");

function drawHorizon(roll, pitch) {
  var w = horizon.width, h = horizon.height;

  const pixelOffset = pitch * 5;

  ctx.clearRect(0, 0, w, h);
  ctx.save();

  ctx.translate(w / 2, h / 2);
  ctx.rotate(roll * Math.PI / 180);

  ctx.fillStyle = "green";
  ctx.fillRect(-w * 2, -h * 2 - pixelOffset, w * 4, h * 2);

  ctx.restore();

  ctx.stroke();
}

function handleMotion(e) {
  var g = e.accelerationIncludingGravity;
  if (!g || g.x === null) return;
  var x = g.x, y = g.y, z = g.z;

  const pitch = Math.atan2(z, Math.sqrt(x * x + y * y)) * (180 / Math.PI);
  const roll = Math.atan2(x, y) * (180 / Math.PI);

  drawHorizon(roll, pitch);
}

function startLevel() {
  if (typeof DeviceMotionEvent.requestPermission === 'function')
    DeviceMotionEvent.requestPermission().then(function (permission) {
      if (permission === 'granted')
        window.addEventListener('devicemotion', handleMotion);
    });
  else window.addEventListener('devicemotion', handleMotion);
}

function resize() {
  horizon.width = horizon.clientWidth;
  horizon.height = horizon.clientHeight;
}

onresize = resize;
resize();

startLevel();