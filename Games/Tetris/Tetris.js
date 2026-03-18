
function Tetris() {

  this.table = document.createElement("table");
}

Tetris.prototype.init = function() {
  document.body.appendChild(this.table);
  alert("Table" + this.table);
};

var tetris = new Tetris();

window.addEventListener("load", function(ev) {
  tetris.init();
}, false);