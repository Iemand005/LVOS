 // Sensors
//  Lasse Lauwerys (2026) c


'use strict';
'use esnext';
'use moz';

if (typeof ondevicemotion !== "undefined") {
  ondevicemotion = function(e) {
    // console.log("Acceleration:", e.acceleration, e.accelerationIncludingGravity);
    Math.cos(e.x)
  }
}