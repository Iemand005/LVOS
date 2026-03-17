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
  // if () {
  //   this.canvas = element;
  // } else if (typeof element == "string") {
  //   this.canvas = document.getElementById(element);
  // }
}

/**
 * @param {string | HTMLCanvasElement} elementId 
 */
function Graphics2D(element) {

}

function drawHorizon(roll, pitch) {
  var w = horizon.width, h = horizon.height;

  const pOffset = pitch * 5;

  ctx.clearRect(0, 0, w, h);
  ctx.save();

  ctx.translate(w / 2, h / 2);
  ctx.rotate(roll * Math.PI / 180);

  ctx.fillStyle = "#3498db";
  ctx.fillRect(-w * 2, -h * 2 - pOffset, w * 4, h * 2);

  ctx.fillStyle = "#8b4513";
  ctx.fillRect(-w * 2, 0 - pOffset, w * 4, h * 2);

  ctx.strokeStyle = "white";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-w, -pOffset);
  ctx.lineTo(w, -pOffset);
  ctx.stroke();

  ctx.restore();

  ctx.strokeStyle = "yellow";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(w / 2 - 40, h / 2);
  ctx.lineTo(w / 2 - 10, h / 2);
  ctx.moveTo(w / 2 + 10, h / 2);
  ctx.lineTo(w / 2 + 40, h / 2);
  ctx.stroke();
}

function handleMotion(e) {
  var g = e.accelerationIncludingGravity;
  if (!g || g.x === null) return;
  var x = g.x, y = g.y, z = g.z;
    
  // var roll = Math.atan2(g.x, g.y);
  // var pitch = Math.atan2(-g.z, Math.sqrt(g.x * g.x + g.y * g.y));

  const pitch = Math.atan2(y, Math.sqrt(x * x + z * z)) * (180 / Math.PI);
  const roll = Math.atan2(-x, z) * (180 / Math.PI);

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