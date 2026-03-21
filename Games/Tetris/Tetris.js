
/**
 * @typedef {"hero" | "smashboy" | "teewee" | "rhode-island-z" | "cleveland-z" | "blue-ricky" | "orange-ricky" } TetrominoType
 */
/**
 * @typedef {{type: TetrominoType, x: number, y: number}} Tetromino
 */

function Tetris() {
  this.table = document.createElement("table");
  /** @type {HTMLElement[][]} */
  this.rows = [];

  this.fallingTetromino = 
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

  layout.forEach(function(row, y) {
    row.forEach(function(block, x) {
      if (block) tetris.rows[y][x].classList.add(type);
    });
  });
};

/**
 * @param {Tetromino} tetromino 
 */
Tetris.prototype.add = function(tetromino) {
  var layout = this.getTetrominoLayout(tetromino.type);
  var tetris = this;
  layout.forEach(function(row, y) {
    row.forEach(function(block, x) {
      if (block) tetris.rows[y + tetromino.y][x + tetromino.x].classList.add(type);
    });
  });
};

/**
 * @param {Tetromino} tetromino 
 */
Tetris.prototype.remove = function(tetromino) {
  var layout = this.getTetrominoLayout(tetromino.type);
  var tetris = this;
  layout.forEach(function(row, y) {
    row.forEach(function(block, x) {
      if (block) tetris.rows[y + tetromino.y][x + tetromino.x].classList.remove(type);
    });
  });
};

/**
 * @param {Tetromino} tetromino 
 * @param {number} newX 
 * @param {number} newY 
 */
Tetris.prototype.canMoveTo = function(tetromino, newX, newY) {
  this.remove(tetromino);
  var layout = this.getTetrominoLayout(tetromino.type);
  var tetris = this;
  layout.forEach(function(row, y) {
    row.forEach(function(block, x) {
      if (block) {
        var length = tetris.rows[y + newY][x + newY].classList.length;
        if (length) {
  this.add(tetromino);
return false;
        } 
      }
    });
  });
  this.add(tetromino);
  return true;
};

/**
 * @param {Tetromino} tetromino 
 * @param {number} x 
 * @param {number} y 
 */
Tetris.prototype.move = function(tetromino, x, y) {
  this.remove(tetromino);
  tetromino.x = x;
  tetromino.y = y;
  this.add(tetromino);
};

Tetris.prototype.update = function() {
  
};

var tetris = new Tetris();

window.addEventListener("load", function(ev) {
  tetris.init();
}, false);