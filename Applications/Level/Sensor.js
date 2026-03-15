if (ondevicemotion) {
  ondevicemotion = function(e) {
    console.log("Acceleration:", e.acceleration, e.accelerationIncludingGravity);
  }
}