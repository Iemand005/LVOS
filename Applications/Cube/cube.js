const { getUserAgentAppendix } = require("discord.js");

const canvas = document.getElementById("canvas");

/**
 * @param {HTMLCanvasElement} canvas 
 */
function Graphics(canvas) {
  this.gl = canvas.getContext("webgl");
  if (!this.gl)
    this.gl = canvas.getContext("experimental-webgl");

  gl.clearColor(1,1,0,1);
  gl.clear(1,1,0,1);
}

Graphics.prototype.clear = function () {

};

const graphics = new Graphics(canvas);
console.log(graphics);