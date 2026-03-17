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
  
  ctx.clearRect(0, 0, w, h);
  ctx.save();

  ctx.translate(w / 2, h / 2);
  ctx.rotate(roll);
    
  var pitchPixels = (pitch / Math.PI) * h; 
  var size = Math.max(w, h) * 4;

  ctx.beginPath();
  ctx.fillStyle = "green";
  ctx.rect(-size / 2, pitchPixels, size, size);
  ctx.fill();

  ctx.globalCompositeOperation = 'destination-over';
  ctx.fillStyle = "skyblue";
  ctx.fillRect(-size / 2, -size / 2, size, size);
  
  ctx.restore();
}

if (typeof ondevicemotion !== "undefined") {
  ondevicemotion = function(e) {
    var g = e.accelerationIncludingGravity;
    if (!g || g.x === null) return;
     
    var roll = Math.atan2(g.x, g.y);
    var pitch = Math.atan2(g.z, -g.y);

    drawHorizon(roll, pitch);
  }
}

function resize() {
  horizon.width = horizon.clientWidth;
  horizon.height = horizon.clientHeight;
}

onresize = resize;
resize();