const canvas = document.getElementById("canvas");

/**
 * @param {HTMLCanvasElement} canvas 
 */
function Graphics(canvas) {
  this.gl = canvas.getContext("webgl");
  this.ie11 = false;
  if (!this.gl) {
    this.gl = canvas.getContext("experimental-webgl");
    if (this.gl) this.ie11 = true;
  }

  this.gl.clearColor(1,1,0,1);
  this.gl.clear(1,1,0,1);
}

Graphics.prototype.clear = function () {
  this.gl.clear(this.gl.COLOR_BUFFER_BIT);

};

const graphics = new Graphics(canvas);
graphics.clear();
console.log(graphics);