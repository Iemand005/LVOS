 // Sensors
//  Lasse Lauwerys (2026) c


'use strict';
'use esnext';
'use moz';

if (typeof ondevicemotion !== "undefined") {
  ondevicemotion = function(e) {
    // console.log("Acceleration:", e.acceleration, e.accelerationIncludingGravity);
    // Math.cos(e.x)
    // console.log("ee", e.accelerationIncludingGravity);
    var acceleration = new Vector3D(e.accelerationIncludingGravity.x, e.accelerationIncludingGravity.y, e.accelerationIncludingGravity.z);
    console.log(" ae", acceleration)
    acceleration.normalize();
    console.log("Acceleration norma:", acceleration);
  }
}