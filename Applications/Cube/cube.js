/*const*/var canvas = document.getElementById("canvas");

/*const*/var vsSource =
  "attribute vec4 aVertexPosition; attribute vec4 aVertexColor; uniform mat4 uModelViewMatrix; uniform mat4 uProjectionMatrix; varying lowp vec4 vColor; void main() { gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition; vColor = aVertexColor; }";
/*const*/var fsSource =
  "varying lowp vec4 vColor; void main() { gl_FragColor = vColor; }";

var mat4 = {
  create: function () {
    return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  },

  multiply: function (out, a, b) {
    var a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a03 = a[3];
    var a10 = a[4],
      a11 = a[5],
      a12 = a[6],
      a13 = a[7];
    var a20 = a[8],
      a21 = a[9],
      a22 = a[10],
      a23 = a[11];
    var a30 = a[12],
      a31 = a[13],
      a32 = a[14],
      a33 = a[15];

    var b00 = b[0],
      b01 = b[1],
      b02 = b[2],
      b03 = b[3];
    var b10 = b[4],
      b11 = b[5],
      b12 = b[6],
      b13 = b[7];
    var b20 = b[8],
      b21 = b[9],
      b22 = b[10],
      b23 = b[11];
    var b30 = b[12],
      b31 = b[13],
      b32 = b[14],
      b33 = b[15];

    out[0] = a00 * b00 + a10 * b01 + a20 * b02 + a30 * b03;
    out[1] = a01 * b00 + a11 * b01 + a21 * b02 + a31 * b03;
    out[2] = a02 * b00 + a12 * b01 + a22 * b02 + a32 * b03;
    out[3] = a03 * b00 + a13 * b01 + a23 * b02 + a33 * b03;
    out[4] = a00 * b10 + a10 * b11 + a20 * b12 + a30 * b13;
    out[5] = a01 * b10 + a11 * b11 + a21 * b12 + a31 * b13;
    out[6] = a02 * b10 + a12 * b11 + a22 * b12 + a32 * b13;
    out[7] = a03 * b10 + a13 * b11 + a23 * b12 + a33 * b13;
    out[8] = a00 * b20 + a10 * b21 + a20 * b22 + a30 * b23;
    out[9] = a01 * b20 + a11 * b21 + a21 * b22 + a31 * b23;
    out[10] = a02 * b20 + a12 * b21 + a22 * b22 + a32 * b23;
    out[11] = a03 * b20 + a13 * b21 + a23 * b22 + a33 * b23;
    out[12] = a00 * b30 + a10 * b31 + a20 * b32 + a30 * b33;
    out[13] = a01 * b30 + a11 * b31 + a21 * b32 + a31 * b33;
    out[14] = a02 * b30 + a12 * b31 + a22 * b32 + a32 * b33;
    out[15] = a03 * b30 + a13 * b31 + a23 * b32 + a33 * b33;
    return out;
  },

  perspective: function (out, fovy, aspect, near, far) {
    var f = 1 / Math.tan(fovy / 2);
    out[0] = f / aspect;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = f;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[15] = 0;

    if (far == null || far === Infinity) {
      out[10] = -1;
      out[14] = -2 * near;
    } else {
      var nf = 1 / (near - far);
      out[10] = (far + near) * nf;
      out[14] = 2 * far * near * nf;
    }

    return out;
  },

  translate: function (out, a, v) {
    var x = v[0],
      y = v[1],
      z = v[2];
    if (a === out) {
      out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
      out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
      out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
      out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
      return out;
    }

    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
    out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
    out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
    out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
    return out;
  },

  rotate: function (out, a, rad, axis) {
    var x = axis[0],
      y = axis[1],
      z = axis[2];
    var len = Math.sqrt(x * x + y * y + z * z);
    if (!len) return null;

    x /= len;
    y /= len;
    z /= len;

    var s = Math.sin(rad);
    var c = Math.cos(rad);
    var t = 1 - c;

    var a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a03 = a[3];
    var a10 = a[4],
      a11 = a[5],
      a12 = a[6],
      a13 = a[7];
    var a20 = a[8],
      a21 = a[9],
      a22 = a[10],
      a23 = a[11];
    var a30 = a[12],
      a31 = a[13],
      a32 = a[14],
      a33 = a[15];

    var b00 = x * x * t + c;
    var b01 = y * x * t + z * s;
    var b02 = z * x * t - y * s;
    var b10 = x * y * t - z * s;
    var b11 = y * y * t + c;
    var b12 = z * y * t + x * s;
    var b20 = x * z * t + y * s;
    var b21 = y * z * t - x * s;
    var b22 = z * z * t + c;

    out[0] = a00 * b00 + a10 * b01 + a20 * b02;
    out[1] = a01 * b00 + a11 * b01 + a21 * b02;
    out[2] = a02 * b00 + a12 * b01 + a22 * b02;
    out[3] = a03 * b00 + a13 * b01 + a23 * b02;
    out[4] = a00 * b10 + a10 * b11 + a20 * b12;
    out[5] = a01 * b10 + a11 * b11 + a21 * b12;
    out[6] = a02 * b10 + a12 * b11 + a22 * b12;
    out[7] = a03 * b10 + a13 * b11 + a23 * b12;
    out[8] = a00 * b20 + a10 * b21 + a20 * b22;
    out[9] = a01 * b20 + a11 * b21 + a21 * b22;
    out[10] = a02 * b20 + a12 * b21 + a22 * b22;
    out[11] = a03 * b20 + a13 * b21 + a23 * b22;
    out[12] = a30;
    out[13] = a31;
    out[14] = a32;
    out[15] = a33;
    return out;
  }
};

Graphics3D.prototype.loadShader = function (type, source) {
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

Graphics3D.prototype.initShaderProgram = function (vsSource, fsSource) {
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
function Graphics3D(canvas) {
  /* @type {HTMLCanvasElement} */
  this.canvas = canvas;
  this.gl =
    canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
  this.ie11 = !!this.gl && !!canvas.getContext("experimental-webgl");

  if (!this.gl) {
    alert("This demo requires WebGL, which is not available in this browser.");
    return;
  }

  this.gl.clearColor(0, 0, 0, 0);
  this.gl.viewport(0, 0, canvas.width, canvas.height);

  this.buffers = {
    position: null,
    indices: null,
    color: null
  };

  this.onrender = function () {};
}

Graphics3D.prototype.clear = function () {
  this.gl.clear(this.gl.COLOR_BUFFER_BIT);
};

Graphics3D.prototype.loadShaders = function (vsSource, fsSource) {
  this.shaderProgram = this.initShaderProgram(vsSource, fsSource);
};

/*let*/var squareRotation = 0.0;
/*let*/var deltaTime = 0;
// /*let*/var now = 0;
/*let*/var then = 0;

Graphics3D.prototype.drawScene = function (programInfo, deltaTime) {
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
  mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

  // Set the drawing position to the "identity" point, which is
  // the center of the scene.
  /*const*/var modelViewMatrix = mat4.create();

  squareRotation += deltaTime;
  mat4.translate(
    modelViewMatrix, // destination matrix
    modelViewMatrix, // matrix to translate
    [0.0, 0.0, -6.0]
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
    /*const*/var vertexCount = 36;
    /*const*/var type = gl.UNSIGNED_SHORT;
    /*const*/var offset = 0;
    gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
  }
};

// Graphics.prototype.render = function () {

// };

Graphics3D.prototype.render = function (now) {
  now *= 0.001; // convert to seconds
  deltaTime = now - then;
  then = now;

  // console.log(this);
  // console.log(deltaTime);
  this.drawScene(programInfo, deltaTime);
  // squareRotation += deltaTime;

  requestAnimationFrame(Graphics3D.prototype.render.bind(this));
};

Graphics3D.prototype.startRendering = function () {
  requestAnimationFrame(Graphics3D.prototype.render.bind(this));
};

Graphics3D.prototype.resize = function (width, height) {
  /*const*/var dpr = window.devicePixelRatio || 1;
  this.canvas.width = width * dpr;
  this.canvas.height = height * dpr;
  this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  // ctx.scale(dpr, dpr);
  if (this.gl.scale) this.gl.scale(dpr, dpr);
};

// export { drawScene };

/*const*/var graphics = new Graphics3D(canvas);
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
