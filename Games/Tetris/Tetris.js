
/** @type {{ readonly [K in string]: K }} */
var TetrominoTypes = {
  hero: "hero",
  smashboy: "smashboy",
  teewee: "teewee",
  rhodeIslandZ: "rhode-island-z",
  clevelandZ: "cleveland-z",
  blueRicky: "blue-ricky",
  orangeRicky: "orange-ricky"
};

/**
 * @typedef {typeof TetrominoTypes[keyof typeof TetrominoTypes]} TetrominoType
 */

/**
 * @param {Tetris} tetris 
 * @param {TetrominoType} type 
 * @param {number?} x 
 * @param {number?} y 
 */
function Tetromino(tetris, type, x, y) {
  this._tetris = tetris;
  this.type = type;

  this._x = x || 0;
  this._y = y || 0;
}

/**
 * @param {TetrominoType} type 
 */
function getTetrominoTypeLayout(type) {
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
}

Object.defineProperty(Tetromino.prototype, "layout", {
  get: function() {
    return getTetrominoTypeLayout(this.type);
  }
});

Object.defineProperty(Tetromino.prototype, "tetris", {
  get: function() { return this._tetris; }
});

Object.defineProperty(Tetromino.prototype, "x", {
  get: function() { return this._x; },
  set: function(x) { this.move(x, this.y); }
});

Object.defineProperty(Tetromino.prototype, "y", {
  get: function() { return this._y; },
  set: function(y) { this.move(this.x, y); }
});

function Tetris() {
  this.table = document.createElement("table");
  /** @type {HTMLElement[][]} */
  this.rows = [];
  /** @type {Tetromino} */
  this.fallingTetromino = null;
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
Tetris.prototype.spawn = function(type) {
  var startX = 0, startY = 0;

  // if (this.fallingTetromino) throw new Error("A tetromino is already falling.");
  this.fallingTetromino = new Tetromino(this, type, startX, startY);
  
  var tetris = this;
  this.fallingTetromino.layout.forEach(function(row, y) {
    row.forEach(function(block, x) {
      if (block) tetris.rows[y][x].classList.add(type);
    });
  });
};

/**
 * @param {Tetromino} tetromino 
 */
Tetris.prototype.add = function(tetromino) {
  try {
    tetromino.forEachElement(function(element) {
      if (element.classList.length) throw new Error("Tried to move into occupied block");
      element.classList.add(this.type);
    });
  } catch(ex) { return false; }
  return true;
};

/**
 * @param {Tetromino} tetromino 
 */
Tetris.prototype.remove = function(tetromino) {
  var tetris = this;
  tetromino.forEachElement(function(element) {
      element.classList.remove(this.type);
  });
};

/**
 * @param {(this: Tetromino, block: boolean, x: number, y: number)} callback 
 */
Tetromino.prototype.forEachBlock = function(callback) {
  this.layout.forEach(function(row, y) { row.forEach(function(block, x) { callback.call(this, !!block, x, y); }, this); }, this);
}

/**
 * @param {(this: Tetromino, element: HTMLElement)} callback 
 */
Tetromino.prototype.forEachElement = function(callback) {
  this.forEachBlock(function(block, x, y) {
      if (block) callback.call(this, tetris.rows[y + this.y][x + this.x]);
  });
}

/**
 * @param {number} newX 
 * @param {number} newY 
 */
Tetromino.prototype.canMoveTo = function(newX, newY) {
  this.tetris.remove(this);
  var tetris = this.tetris;
  this.layout.forEach(function(row, y) {
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
 * @param {number} x 
 * @param {number} y 
 */
Tetromino.prototype.move = function(x, y) {
  this.tetris.remove(this);
  var oldX = this.x, oldY = this.y;
  this._x = x;
  this._y = y;
  var ok = this.tetris.add(this);
  if (!ok) {
    this._x = oldX, this._y = oldY;
    this.tetris.add(this);
  }
  return ok;
};

Tetromino.prototype.fall = function() {
  return this.move(this.x, this.y + 1);
};

Tetris.prototype.update = function() {
  var ok = this.fallingTetromino.fall();
  if (!ok) {
    this.spawn()
  }
};

var tetris = new Tetris();

window.addEventListener("load", function(ev) {
  tetris.init();
}, false);