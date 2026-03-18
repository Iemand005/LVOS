
function Tetris() {

  this.table = document.createElement("table");
}

Tetris.prototype.init = function() {
  document.body.appendChild(this.table);
};

var tetris = new Tetris();

document.addEventListener("load", function(ev) {
  tetris.init();
});