 // Sensors
//  Lasse Lauwerys (2026) c


'use strict';
'use esnext';
'use moz';

var horizon = document.getElementById("horizon");

if (typeof ondevicemotion !== "undefined") {
  ondevicemotion = function(e) {
    var g = e.accelerationIncludingGravity;
    var acceleration = new Vector3D(g.x, g.y, g.z);
    acceleration.normalize();
    // console.log("Acceleration norma:", acceleration);
     
    var roll = Math.atan2(acceleration.x, acceleration.z);
    var pitch = -acceleration.y;
    console.log("Roll:", roll, pitch);

    var rollDeg = roll * (180 / Math.PI);
    var pitchDeg = pitch * (180 / Math.PI);

    horizon.style.transform = horizon.style.webkitTransform = "rotateX(" + pitchDeg + "deg) rotateY(" + rollDeg + "deg)";
  }
}