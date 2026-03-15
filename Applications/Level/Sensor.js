 // Sensors
//  Lasse Lauwerys (2026) c


'use strict';
'use esnext';
'use moz';

if (ondevicemotion) {
  ondevicemotion = function(e) {
    console.log("Acceleration:", e.acceleration, e.accelerationIncludingGravity);
  }
}