
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
 * @typedef {"hero" | "smashboy" | "teewee" | "rhode-island-z" | "cleveland-z" | "blue-ricky" | "orange-ricky" } TetrominoType
 */

var
hero = [
  [1, 1],
  [1, 1]
],
smashboy = [

]

/**
 * @param {TetrominoType} type 
 */
Tetris.prototype.getTetrominoLayout = function(type) {
  switch (type) {
    case "hero": return [
      [1, 1],
      [1, 1]
    ];
    case "teewee": return [
      [0, 1, 0],
      [1, 1, 1]
    ];
    case "smashboy": return [
      
    ];
    case "blue-ricky": return [
      [1, 0],
      [1, 0],
      [1, 1]
    ];
    case "cleveland-z": return [
      [1, 1, 0],
      [0, 1, 1]
    ];
    case "orange-ricky": return [
      [0, 1],
      [0, 1],
      [1, 1]
    ];
    case "rhode-island-z": return [
      [0, 1, 1],
      [1, 1, 0]
    ];
  }
};

/**
 * @param {TetrominoType} type 
 */
Tetris.prototype.spawn = function(type) {
  var layout = this.getTetrominoLayout();
}

var tetris = new Tetris();

window.addEventListener("load", function(ev) {
  tetris.init();
}, false);