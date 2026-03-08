const canvas = document.getElementById("canvas");

const vsSource = `
    attribute vec4 aVertexPosition;
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    void main() {
      gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
    }
  `;

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

  this.gl.clearColor(0,0,0,1);
}

Graphics.prototype.clear = function () {
  this.gl.clear(this.gl.COLOR_BUFFER_BIT);

};

const graphics = new Graphics(canvas);
graphics.clear();
console.log(graphics);