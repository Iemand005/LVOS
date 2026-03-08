const canvas = document.getElementById("canvas");

const vsSource = "attribute vec4 aVertexPosition; uniform mat4 uModelViewMatrix; uniform mat4 uProjectionMatrix; void main() { gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition; }";
const fsSource = "void main() { gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0); }";

Graphics.prototype.loadShader = function (type, source) {
  const shader = gl.createShader(type);

  // Send the source to the shader object

  this.gl.shaderSource(shader, source);

  // Compile the shader program

  this.gl.compileShader(shader);

  // See if it compiled successfully

  if (!this.gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert("An error occurred compiling the shaders: " + this.gl.getShaderInfoLog(shader));
    this.gl.deleteShader(shader);
    return null;
  }

  return shader;
}

Graphics.prototype.initShaderProgram = function (vsSource, fsSource) {
  const vertexShader = loadShader(this.gl.VERTEX_SHADER, vsSource);
  const fragmentShader = loadShader(this.gl.FRAGMENT_SHADER, fsSource);

  // Create the shader program

  const shaderProgram = this.gl.createProgram();
  this.gl.attachShader(shaderProgram, vertexShader);
  this.gl.attachShader(shaderProgram, fragmentShader);
  this.gl.linkProgram(shaderProgram);

  // If creating the shader program failed, alert

  if (!this.gl.getProgramParameter(shaderProgram, this.gl.LINK_STATUS)) {
    alert("Unable to initialize the shader program: " + this.gl.getProgramInfoLog(shaderProgram));
    return null;
  }

  return shaderProgram;
}


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

Graphics.prototype.loadShaders = function () {
  this.shaderProgram = this.initShaderProgram(vsSource, fsSource);
};

const graphics = new Graphics(canvas);
graphics.clear();
console.log(graphics);