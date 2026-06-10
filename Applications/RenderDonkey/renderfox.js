
const canvas = document.getElementById("canvas");

// const vsSource =
//   "attribute vec4 aVertexPosition; attribute vec4 aVertexColor; uniform mat4 uModelViewMatrix; uniform mat4 uProjectionMatrix; varying lowp vec4 vColor; void main() { gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition; vColor = aVertexColor; }";
// const fsSource =
//   "varying lowp vec4 vColor; void main() { gl_FragColor = vColor; }";


  var vsSource =
"attribute vec2 p;" +
"void main(){" +
"gl_Position=vec4(p,0.0,1.0);" +
"}";

// Fragment shader
var fsSource =
"precision mediump float;" +
"void main(){" +
"gl_FragColor=vec4(0.2,0.6,1.0,1.0);" +
"}";

const camera = new Camera();

Graphics3D.prototype.render = function(now) {
  now *= 0.001; // convert to seconds
  deltaTime = now - then;
  then = now;

//   camera.rotation.x += deltaTime * 7;
//   camera.rotation.y += deltaTime * 3;
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

const positions = [
  -1, -1, 0,
   3, -1, 0,
  -1,  3, 0
];

// Now pass the list of positions into WebGL to build the
// shape. We do this by creating a Float32Array from the
// JavaScript array, then use it to fill the current buffer.
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);


const colors = [
  1,0,0,1,
  0,1,0,1,
  0,0,1,1
];

const colorBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

const buffers = {
  position: positionBuffer,
  color: colorBuffer
};

graphics.buffers = buffers;

graphics.resize();
graphics.startRendering();

console.log(graphics);

window.onresize = function (ev) {
  graphics.resize();
};

// var gl = canvas.getContext("webgl");

function resize()
{
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
}
window.onresize = resize;
resize();

// Vertex shader (fullscreen triangle)
var vs =
"attribute vec2 p;" +
"void main(){" +
"gl_Position=vec4(p,0.0,1.0);" +
"}";

// Fragment shader
var fs =
"precision mediump float;" +
"void main(){" +
"gl_FragColor=vec4(0.2,0.6,1.0,1.0);" +
"}";

function compile(type, src)
{
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
}

var program = gl.createProgram();
gl.attachShader(program, compile(gl.VERTEX_SHADER, vs));
gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fs));
gl.linkProgram(program);
gl.useProgram(program);

// Fullscreen triangle (NO buffers, just 1 attribute)
var buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

// fullscreen triangle
var vertices = new Float32Array([
    -1, -1,
     3, -1,
    -1,  3
]);

gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

var loc = gl.getAttribLocation(program, "p");
gl.enableVertexAttribArray(loc);
gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

function draw()
{
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    requestAnimationFrame(draw);
}
draw();
