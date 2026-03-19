
function Tetris() {
  this.table = document.createElement("table");
  this.rows = [];
  this.blocks = [];
}

Tetris.prototype.init = function() {
  document.body.appendChild(this.table);

  this.createGrid(10, 2);
};

Tetris.prototype.createGrid = function(width, height) {
  
  for (var y = 0; y < height; y++) {
    var row = this.table.appendChild(document.createElement("tr"));

    for (var x = 0; x < width; x++) {
      var data = row.appendChild(document.createElement("td"));
      data.classList.add("hero");
    }

    this.rows.push(row);
  }

}

/**
 * @typedef {"hero" | "rickey" | "smashboy" | "teewee" | "rhode-island-z" | "cleveland-z" | "blue-ricky" | "orange-ricky" } TetrominoType
 */

const hero = [
  [1, 1],
  [1, 1]
];

const 

/**
 * 
 * @param {TetrominoType} type 
 */
Tetris.prototype.spawn = function(type) {
  switch (type) {
    case "hero":
  }
}

var tetris = new Tetris();

window.addEventListener("load", function(ev) {
  tetris.init();
}, false);