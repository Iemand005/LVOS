
function Tetris() {

  this.table = document.createElement("table");
}

Tetris.prototype.init = function() {
  document.body.appendChild(this.table);
};

Tetris.prototype.render = function()

var tetris = new Tetris();

window.addEventListener("load", function(ev) {
  tetris.init();
}, false);