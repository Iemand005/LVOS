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
  var size = Math.max(w, h) * 4;

  ctx.clearRect(0, 0, w, h);
  
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(roll);

  var pitchOffset = (pitch / (Math.PI / 2)) * (h / 2);

  ctx.beginPath();
  ctx.fillStyle = "skyblue";
  ctx.arc(0, pitchOffset + size, size, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.fillStyle = "green";
  ctx.arc(0, pitchOffset - size, size, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.strokeStyle = "white";
  ctx.lineWidth = 2;
  ctx.moveTo(-size, pitchOffset);
  ctx.lineTo(size, pitchOffset);
  ctx.stroke();
  ctx.restore();

  ctx.beginPath();
  ctx.strokeStyle = "red";
  ctx.lineWidth = 3;
  ctx.moveTo(w / 2 - 20, h / 2);
  ctx.lineTo(w / 2 + 20, h / 2);
  ctx.moveTo(w / 2, h / 2 - 20);
  ctx.lineTo(w / 2, h / 2 + 20);
  ctx.stroke();
}

if (typeof ondevicemotion !== "undefined") {
  ondevicemotion = function(e) {
    var g = e.accelerationIncludingGravity;
    if (!g || g.x === null) return;
     
    var roll = Math.atan2(g.x, g.y);
    var pitch = Math.atan2(g.z, Math.sqrt(g.x * g.x + g.y * g.y));

    drawHorizon(roll, pitch);
  }
}

function resize() {
  horizon.width = horizon.clientWidth;
  horizon.height = horizon.clientHeight;
}

onresize = resize;
resize();