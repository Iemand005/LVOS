
/**
 * @typedef {"hero" | "smashboy" | "teewee" | "rhode-island-z" | "cleveland-z" | "blue-ricky" | "orange-ricky" } TetrominoType
 */

function Tetris() {
  this.table = document.createElement("table");
  /** @type {HTMLElement[][]} */
  this.rows = [];
  this.blocks = [];
}

Tetris.prototype.init = function() {
  document.body.appendChild(this.table);

  this.createGrid(6, 10);
};

Tetris.prototype.createGrid = function(width, height) {
  
  for (var y = 0; y < height; y++) {
    var row = this.table.appendChild(document.createElement("tr"));
    /** @type {HTMLElement[]} */
    var rowData = [];

    for (var x = 0; x < width; x++) {
      var data = row.appendChild(document.createElement("td"));
      // data.classList.add("hero");
      rowData.push(data);
    }

    this.rows.push(rowData);
  }

}

/**
 * @param {TetrominoType} type 
 */
Tetris.prototype.getTetrominoLayout = function(type) {
  switch (type) {
    case "hero": return [
      [1, 1, 1, 1]
    ];
    case "teewee": return [
      [0, 1, 0],
      [1, 1, 1]
    ];
    case "smashboy": return [
      [1, 1],
      [1, 1]
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
  var layout = this.getTetrominoLayout(type);

  var startX = 0, startY = 0;

  var tetris = this;

  layout.forEach(function (row, y) {
    row.forEach(function (block, x) {
      // alert(block + "x: " + x + "y: " +y);
      console.log(tetris.rows[y][x])
      if (block) tetris.rows[y][x].classList.add(type);
    });
  });
};

Tetris.prototype.update = function() {
  
};

var tetris = new Tetris();

window.addEventListener("load", function(ev) {
  tetris.init();
}, false);