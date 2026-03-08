const canvas = document.getElementById("canvas");

const vsSource = "attribute vec4 aVertexPosition; attribute vec4 aVertexColor; uniform mat4 uModelViewMatrix; uniform mat4 uProjectionMatrix; varying lowp vec4 vColor; void main() { gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition; vColor = aVertexColor; }";
const fsSource = "varying lowp vec4 vColor; void main() { gl_FragColor = vColor; }";

Graphics.prototype.loadShader = function (type, source) {
  const shader = this.gl.createShader(type);
  this.gl.shaderSource(shader, source);
  this.gl.compileShader(shader);

  // See if it compiled successfully

  if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
    alert("An error occurred compiling the shaders: " + this.gl.getShaderInfoLog(shader));
    this.gl.deleteShader(shader);
    return null;
  }

  return shader;
}

Graphics.prototype.initShaderProgram = function (vsSource, fsSource) {
  const vertexShader = this.loadShader(this.gl.VERTEX_SHADER, vsSource);
  const fragmentShader = this.loadShader(this.gl.FRAGMENT_SHADER, fsSource);

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
  /* @type {HTMLCanvasElement} */
  this.canvas = canvas;
  this.gl = canvas.getContext("webgl");
  this.ie11 = false;
  if (!this.gl) {
    this.gl = canvas.getContext("experimental-webgl");
    if (this.gl) this.ie11 = true;
  }

  this.gl.clearColor(0,0,0,1);

  this. buffers = {
    position: [],
    indices: [],
    color: []
  };;

  
  this.onrender = function () {};
}

Graphics.prototype.clear = function () {
  this.gl.clear(this.gl.COLOR_BUFFER_BIT);
};

Graphics.prototype.loadShaders = function (vsSource, fsSource) {
  const gl = this.gl;
  this.shaderProgram = this.initShaderProgram(vsSource, fsSource);

  

  const positionBuffer = gl.createBuffer();

  // Select the positionBuffer as the one to apply buffer
  // operations to from here out.
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  // Now create an array of positions for the square.
  const positions = [1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, -1.0];

  // Now pass the list of positions into WebGL to build the
  // shape. We do this by creating a Float32Array from the
  // JavaScript array, then use it to fill the current buffer.
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
};

let squareRotation = 0.0;
let deltaTime = 0;
// let now = 0;
let then = 0;

Graphics.prototype.drawScene = function (programInfo, deltaTime) {
  const gl = this.gl;

  gl.clearColor(0.0, 0.0, 0.0, 1.0); // Clear to black, fully opaque
  gl.clearDepth(1.0); // Clear everything
  gl.enable(gl.DEPTH_TEST); // Enable depth testing
  gl.depthFunc(gl.LEQUAL); // Near things obscure far things

  // Clear the canvas before we start drawing on it.

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Create a perspective matrix, a special matrix that is
  // used to simulate the distortion of perspective in a camera.
  // Our field of view is 45 degrees, with a width/height
  // ratio that matches the display size of the canvas
  // and we only want to see objects between 0.1 units
  // and 100 units away from the camera.

  const fieldOfView = (45 * Math.PI) / 180; // in radians
  const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
  const zNear = 0.1;
  const zFar = 100.0;
  const projectionMatrix = mat4.create();

  // note: glMatrix always has the first argument
  // as the destination to receive the result.
  // gl.gM
  mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

  // Set the drawing position to the "identity" point, which is
  // the center of the scene.
  const modelViewMatrix = mat4.create();

  // Now move the drawing position a bit to where we want to
  // start drawing the square.
  // now *= 0.001; // convert to seconds
  // deltaTime = now - then;
  // then = now;
  squareRotation += deltaTime;
  mat4.translate(
    modelViewMatrix, // destination matrix
    modelViewMatrix, // matrix to translate
    // squareRotation,
    [-0.0, 0.0, -6.0]
  ); // amount to translate

//   mat4.rotate(
//   modelViewMatrix, // destination matrix
//   modelViewMatrix, // matrix to rotate
//   squareRotation, // amount to rotate in radians
//   [0, 0, 1]
// );

mat4.rotate(
  modelViewMatrix, // destination matrix
  modelViewMatrix, // matrix to rotate
  squareRotation, // amount to rotate in radians
  [0, 0, 1]
); // axis to rotate around (Z)
mat4.rotate(
  modelViewMatrix, // destination matrix
  modelViewMatrix, // matrix to rotate
  squareRotation * 0.7, // amount to rotate in radians
  [0, 1, 0]
); // axis to rotate around (Y)
mat4.rotate(
  modelViewMatrix, // destination matrix
  modelViewMatrix, // matrix to rotate
  squareRotation * 0.3, // amount to rotate in radians
  [1, 0, 0]
); // axis to rotate around (X)

  // Tell WebGL how to pull out the positions from the position
  // buffer into the vertexPosition attribute.
  {  const numComponents = 2; // pull out 2 values per iteration
  const type = gl.FLOAT; // the data in the buffer is 32bit floats
  const normalize = false; // don't normalize
  const stride = 0; // how many bytes to get from one set of values to the next
  // 0 = use type and numComponents above
  const offset = 0; // how many bytes inside the buffer to start from
  gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position);
  gl.vertexAttribPointer(
    programInfo.attribLocations.vertexPosition,
    numComponents,
    type,
    normalize,
    stride,
    offset
  );
  gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
}



  const numComponents = 4;
  const type = gl.FLOAT;
  const normalize = false;
  const stride = 0;
  const offset = 0;
  gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.color);
  gl.vertexAttribPointer(
    programInfo.attribLocations.vertexColor,
    numComponents,
    type,
    normalize,
    stride,
    offset
  );
  gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor);

  // Tell WebGL to use our program when drawing
  gl.useProgram(programInfo.program);

  // Set the shader uniforms
  gl.uniformMatrix4fv(
    programInfo.uniformLocations.projectionMatrix,
    false,
    projectionMatrix
  );
  gl.uniformMatrix4fv(
    programInfo.uniformLocations.modelViewMatrix,
    false,
    modelViewMatrix
  );

  {
    // const offset = 0;
    // const vertexCount = 4;
    // gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);

    const vertexCount = 36;
  const type = gl.UNSIGNED_SHORT;
  const offset = 0;
  gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
  }
}

// Graphics.prototype.render = function () {

// };

Graphics.prototype.render = function (now) {
  now *= 0.001; // convert to seconds
  deltaTime = now - then;
  then = now;

  // console.log(this);
  // console.log(deltaTime);

  this.drawScene(programInfo, deltaTime);
  // squareRotation += deltaTime;

  requestAnimationFrame(Graphics.prototype.render.bind(this));
}

Graphics.prototype.startRendering = function () {
  requestAnimationFrame(Graphics.prototype.render.bind(this));
};

Graphics.prototype.resize = function (width, height) {
  this.canvas.width = width;
  this.canvas.height = height;
  gl.viewport(0, 0, width, height);
};


// export { drawScene };

const graphics = new Graphics(canvas);
const gl = graphics.gl;
graphics.clear();
graphics.loadShaders(vsSource, fsSource);

const programInfo = {
  program: graphics.shaderProgram,
  attribLocations: {
    vertexPosition: gl.getAttribLocation(graphics.shaderProgram, "aVertexPosition"),
    vertexColor: gl.getAttribLocation(graphics.shaderProgram, "aVertexColor")
  },
  uniformLocations: {
    projectionMatrix: gl.getUniformLocation(graphics.shaderProgram, "uProjectionMatrix"),
    modelViewMatrix: gl.getUniformLocation(graphics.shaderProgram, "uModelViewMatrix")
  }
};


const positionBuffer = gl.createBuffer();

  // Select the positionBuffer as the one to apply buffer
  // operations to from here out.
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  // Now create an array of positions for the square.
  // const positions = [1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, -1.0];y

  const positions = [
  // Front face
  -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0, 1.0, 1.0, -1.0, 1.0, 1.0,

  // Back face
  -1.0, -1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, -1.0, -1.0,

  // Top face
  -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0,

  // Bottom face
  -1.0, -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, -1.0, -1.0, 1.0,

  // Right face
  1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0, 1.0, 1.0, -1.0, 1.0,

  // Left face
  -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, -1.0
];

  // Now pass the list of positions into WebGL to build the
  // shape. We do this by creating a Float32Array from the
  // JavaScript array, then use it to fill the current buffer.
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW)


const indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

  // This array defines each face as two triangles, using the
  // indices into the vertex array to specify each triangle's
  // position.

  // prettier-ignore
  const indices = [
     0,  1,  2,      0,  2,  3,    // front
     4,  5,  6,      4,  6,  7,    // back
     8,  9,  10,     8,  10, 11,   // top
     12, 13, 14,     12, 14, 15,   // bottom
     16, 17, 18,     16, 18, 19,   // right
     20, 21, 22,     20, 22, 23   // left
  ];

  // Now send the element array to GL

  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array(indices),
    gl.STATIC_DRAW
  );
  
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.indices);
  // ith this code:
// js

const faceColors = [
  [1.0, 1.0, 1.0, 1.0], // Front face: white
  [1.0, 0.0, 0.0, 1.0], // Back face: red
  [0.0, 1.0, 0.0, 1.0], // Top face: green
  [0.0, 0.0, 1.0, 1.0], // Bottom face: blue
  [1.0, 1.0, 0.0, 1.0], // Right face: yellow
  [1.0, 0.0, 1.0, 1.0] // Left face: purple
];

// Convert the array of colors into a table for all the vertices.

let colors = [];

for (let cIndex in faceColors) {
  // Repeat each color four times for the four vertices of the face
  const c = faceColors[i];
  colors = colors.concat(c, c, c, c);
}



  const colorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

const buffers = {
    position: positionBuffer,
    indices: indexBuffer,
    color: colorBuffer
  };;

  graphics.buffers = buffers;

graphics.drawScene(programInfo, buffers, 0);
graphics.startRendering();

console.log(graphics);

window.onresize = function (ev) {
  const bounds =  canvas.getBoundingClientRect();
  graphics.resize(bounds.width, bounds.height);
}