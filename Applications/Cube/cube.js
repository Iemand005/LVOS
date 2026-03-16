/*const*/var canvas = document.getElementById("canvas");

/*const*/var vsSource =
  "attribute vec4 aVertexPosition; attribute vec4 aVertexColor; uniform mat4 uModelViewMatrix; uniform mat4 uProjectionMatrix; varying lowp vec4 vColor; void main() { gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition; vColor = aVertexColor; }";
/*const*/var fsSource =
  "varying lowp vec4 vColor; void main() { gl_FragColor = vColor; }";

Graphics.prototype.loadShader = function (type, source) {
  /*const*/var shader = this.gl.createShader(type);
  this.gl.shaderSource(shader, source);
  this.gl.compileShader(shader);

  // See if it compiled successfully

  if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
    alert(
      "An error occurred compiling the shaders: " +
        this.gl.getShaderInfoLog(shader)
    );
    this.gl.deleteShader(shader);
    return null;
  }

  return shader;
};

Graphics.prototype.initShaderProgram = function (vsSource, fsSource) {
  /*const*/var vertexShader = this.loadShader(this.gl.VERTEX_SHADER, vsSource);
  /*const*/var fragmentShader = this.loadShader(this.gl.FRAGMENT_SHADER, fsSource);

  // Create the shader program

  /*const*/var shaderProgram = this.gl.createProgram();
  this.gl.attachShader(shaderProgram, vertexShader);
  this.gl.attachShader(shaderProgram, fragmentShader);
  this.gl.linkProgram(shaderProgram);

  // If creating the shader program failed, alert

  if (!this.gl.getProgramParameter(shaderProgram, this.gl.LINK_STATUS)) {
    alert(
      "Unable to initialize the shader program: " +
        this.gl.getProgramInfoLog(shaderProgram)
    );
    return null;
  }

  return shaderProgram;
};

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

  this.gl.clearColor(0, 0, 0, 0);

  this.buffers = {
    position: [],
    indices: [],
    color: []
  };

  this.onrender = function () {};
}

Graphics.prototype.clear = function () {
  this.gl.clear(this.gl.COLOR_BUFFER_BIT);
};

Graphics.prototype.loadShaders = function (vsSource, fsSource) {
  /*const*/var gl = this.gl;
  this.shaderProgram = this.initShaderProgram(vsSource, fsSource);

  /*const*/var positionBuffer = gl.createBuffer();

  // Select the positionBuffer as the one to apply buffer
  // operations to from here out.
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  // Now create an array of positions for the square.
  /*const*/var positions = [1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, -1.0];

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
};

/*let*/var squareRotation = 0.0;
/*let*/var deltaTime = 0;
// /*let*/var now = 0;
/*let*/var then = 0;

Graphics.prototype.drawScene = function (programInfo, deltaTime) {
  /*const*/var gl = this.gl;

  gl.clearDepth(1.0); // Clear everything
  gl.enable(gl.DEPTH_TEST); // Enable depth testing
  gl.depthFunc(gl.LEQUAL); // Near things obscure far things

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  /*const*/var fov = 45;

  /*const*/var fieldOfView = (fov * Math.PI) / 180; // in radians
  /*const*/var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
  /*const*/var zNear = 0.1;
  /*const*/var zFar = 100.0;
  /*const*/var projectionMatrix = mat4.create();

  // note: glMatrix always has the first argument
  // as the destination to receive the result.
  // gl.gM
  mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

  // Set the drawing position to the "identity" point, which is
  // the center of the scene.
  /*const*/var modelViewMatrix = mat4.create();

  squareRotation += deltaTime;
  mat4.translate(
    modelViewMatrix, // destination matrix
    modelViewMatrix, // matrix to translate
    [-0.0, 0.0, -6.0]
  ); // amount to translate

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
  {
    /*const*/var numComponents = 3; // pull out 3 values per iteration (x, y, z)
    /*const*/var type = gl.FLOAT; // the data in the buffer is 32bit floats
    /*const*/var normalize = false; // don't normalize
    /*const*/var stride = 0; // how many bytes to get from one set of values to the next
    // 0 = use type and numComponents above
    /*const*/var offset = 0; // how many bytes inside the buffer to start from
    if (!this.buffers) return;
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

  /*const*/var numComponents = 4;
  /*const*/var type = gl.FLOAT;
  /*const*/var normalize = false;
  /*const*/var stride = 0;
  /*const*/var offset = 0;
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
    // /*const*/var offset = 0;
    // /*const*/var vertexCount = 4;
    // gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);

    /*const*/var vertexCount = 36;
    /*const*/var type = gl.UNSIGNED_SHORT;
    /*const*/var offset = 0;
    gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
  }
};

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
};

Graphics.prototype.startRendering = function () {
  requestAnimationFrame(Graphics.prototype.render.bind(this));
};

Graphics.prototype.resize = function (width, height) {
  /*const*/var dpr = window.devicePixelRatio || 1;
  this.canvas.width = width * dpr;
  this.canvas.height = height * dpr;
  this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  // ctx.scale(dpr, dpr);
  if (this.gl.scale) this.gl.scale(dpr, dpr);
};

// export { drawScene };

/*const*/var graphics = new Graphics(canvas);
/*const*/var gl = graphics.gl;
graphics.clear();
graphics.loadShaders(vsSource, fsSource);

/*const*/var programInfo = {
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

/*const*/var positionBuffer = gl.createBuffer();

// Select the positionBuffer as the one to apply buffer
// operations to from here out.
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

// Now create an array of positions for the square.
// /*const*/var positions = [1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, -1.0];y

/*const*/var positions = [
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

/*const*/var indexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

// This array defines each face as two triangles, using the
// indices into the vertex array to specify each triangle's
// position.

// prettier-ignore
/*const*/var indices = [
  0, 1, 2, 0, 2, 3,    // front
  4, 5, 6, 4, 6, 7,    // back
  8, 9, 10, 8, 10, 11,   // top
  12, 13, 14, 12, 14, 15,   // bottom
  16, 17, 18, 16, 18, 19,   // right
  20, 21, 22, 20, 22, 23   // left
];

/*const*/var faceColors = [
  [1.0, 1.0, 1.0, 1.0], // Front face: white
  [1.0, 0.0, 0.0, 1.0], // Back face: red
  [0.0, 1.0, 0.0, 1.0], // Top face: green
  [0.0, 0.0, 1.0, 1.0], // Bottom face: blue
  [1.0, 1.0, 0.0, 1.0], // Right face: yellow
  [1.0, 0.0, 1.0, 1.0] // Left face: purple
];

// Convert the array of colors into a table for all the vertices.

/*let*/var colors = [];

for (/*let*/var cIndex in faceColors) {
  // Repeat each color four times for the four vertices of the face
  /*const*/var c = faceColors[cIndex];
  colors = colors.concat(c, c, c, c);
}

/*const*/var colorBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

/*const*/var buffers = {
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

/*const*/var bounds = canvas.getBoundingClientRect();
graphics.resize(bounds.width, bounds.height);
graphics.startRendering();

console.log(graphics);

window.onresize = function (ev) {
  /*const*/var bounds = canvas.getBoundingClientRect();
  graphics.resize(bounds.width, bounds.height);
};
