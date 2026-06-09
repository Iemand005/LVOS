const canvas = document.getElementById("canvas");

const vsSource =
  "attribute vec4 aVertexPosition; attribute vec4 aVertexColor; uniform mat4 uModelViewMatrix; uniform mat4 uProjectionMatrix; varying lowp vec4 vColor; void main() { gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition; vColor = aVertexColor; }";
const fsSource =
  "varying lowp vec4 vColor; void main() { gl_FragColor = vColor; }";

const camera = new Camera();

Graphics3D.prototype.render = function(now) {
  now *= 0.001; // convert to seconds
  deltaTime = now - then;
  then = now;

  camera.rotation.x += deltaTime * 10;
  camera.rotation.y += deltaTime * 5;
  this.drawScene(programInfo, deltaTime, camera);

  requestAnimationFrame(Graphics3D.prototype.render.bind(this));
};

Graphics3D.prototype.startRendering = function() {
  requestAnimationFrame(Graphics3D.prototype.render.bind(this));
};

const graphics = new Graphics3D(canvas);
const gl = graphics.gl;
graphics.clear();
graphics.loadShaders(vsSource, fsSource);

const programInfo = {
  program: graphics.shaderProgram,
  attribLocations: {
    vertexPosition: gl.getAttribLocation(
      graphics.shaderProgram,
      "aVertexPosition"
    ),
    vertexColor: gl.getAttribLocation(graphics.shaderProgram, "aVertexColor")
  },
  uniformLocations: {
    projectionMatrix: gl.getUniformLocation(
      graphics.shaderProgram,
      "uProjectionMatrix"
    ),
    modelViewMatrix: gl.getUniformLocation(
      graphics.shaderProgram,
      "uModelViewMatrix"
    )
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
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

const indexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

// This array defines each face as two triangles, using the
// indices into the vertex array to specify each triangle's
// position.

const indices = [
  0, 1, 2, 0, 2, 3,    // front
  4, 5, 6, 4, 6, 7,    // back
  8, 9, 10, 8, 10, 11,   // top
  12, 13, 14, 12, 14, 15,   // bottom
  16, 17, 18, 16, 18, 19,   // right
  20, 21, 22, 20, 22, 23   // left
];

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
  const c = faceColors[cIndex];
  colors = colors.concat(c, c, c, c);
}

const colorBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

const buffers = {
  position: positionBuffer,
  indices: indexBuffer,
  color: colorBuffer
};

gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);
gl.bufferData(
  gl.ELEMENT_ARRAY_BUFFER,
  new Uint16Array(indices),
  gl.STATIC_DRAW
);

graphics.buffers = buffers;

graphics.resize();
graphics.startRendering();

console.log(graphics);

window.onresize = function (ev) {
  graphics.resize();
};
