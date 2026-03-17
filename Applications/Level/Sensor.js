 // Sensors
//  Lasse Lauwerys (2026) c


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
    ctx.clearRect(0, 0, horizon.width, horizon.height);

    ctx.save();
    ctx.translate(horizon.width / 2, horizon.height / 2);
    
    ctx.rotate(roll);
    
    var pitchOffset = pitch * horizon.height - horizon.height / 2; 

    ctx.beginPath();
    ctx.fillStyle = "green";
    ctx.moveTo(-horizon.width, pitchOffset);
    ctx.lineTo(horizon.width, pitchOffset);
    ctx.lineTo(horizon.width, horizon.height);
    ctx.lineTo(-horizon.width, horizon.height);
    ctx.fill();

    ctx.restore();
}

if (typeof ondevicemotion !== "undefined") {
  ondevicemotion = function(e) {
    var g = e.accelerationIncludingGravity;
    var acceleration = new Vector3D(g.x, g.y, g.z);
    acceleration.normalize();
     
    var roll = Math.atan2(acceleration.x, acceleration.z);
    var pitch = acceleration.y;

    drawHorizon(roll, pitch);
  }
}

function resize() {
  horizon.width = horizon.clientWidth;
  horizon.height = horizon.clientHeight;
}

onresize = resize;
resize();