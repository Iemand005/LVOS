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
  var diag = Math.sqrt(w * w + h * h);

  ctx.clearRect(0, 0, w, h);
  ctx.save();

  ctx.translate(w / 2, h / 2);
  ctx.rotate(roll + Math.PI);
    
  // var pitchPixels = (pitch / (Math.PI / 2)) * (h / 2);
  var pitchOffset = (pitch / Math.PI) * horizon.height - h/2; 

  ctx.beginPath();
  ctx.fillStyle = "green";

  var size = Math.max(horizon.width, horizon.height) * 4;
  ctx.rect(-size / 2, pitchOffset, size, size);
  ctx.fill();

  ctx.restore();
}

if (typeof ondevicemotion !== "undefined") {
  ondevicemotion = function(e) {
    var g = e.accelerationIncludingGravity;
    if (!g) return;
     
    var roll = Math.atan2(g.x, g.y);
    // var pitch = acceleration.y;

    var pitch = Math.atan2(g.z, g.y );

    drawHorizon(roll, pitch);
  }
}

function resize() {
  horizon.width = horizon.clientWidth;
  horizon.height = horizon.clientHeight;
}

onresize = resize;
resize();