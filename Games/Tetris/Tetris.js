
function Tetris() {
  this.table = document.createElement("table");
  this.rows = [];
}

Tetris.prototype.init = function() {
  document.body.appendChild(this.table);

  this.createGrid(1,1);
};

Tetris.prototype.createGrid = function(width, height) {
  
  for (var y = 0; y < height; y++) {
    var row = this.table.appendChild(document.createElement("tr"));

    for (var x = 0; x < width; x++) {
      var data = row.appendChild(document.createElement("td"));
      data.textContent = "hey";
    }

    this.rows.push(row);
  }

}

var tetris = new Tetris();

window.addEventListener("load", function(ev) {
  tetris.init();
}, false);