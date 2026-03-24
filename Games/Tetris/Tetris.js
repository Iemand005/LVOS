
/**
 * @typedef {"hero" | "smashboy" | "teewee" | "rhode-island-z" | "cleveland-z" | "blue-ricky" | "orange-ricky"} TetrominoType
 */

/** @type {{[type: string]: TetrominoType}} */
var TetrominoTypes = {
  hero: "hero",
  smashboy: "smashboy",
  teewee: "teewee",
  rhodeIslandZ: "rhode-island-z",
  clevelandZ: "cleveland-z",
  blueRicky: "blue-ricky",
  orangeRicky: "orange-ricky"
};

var KeyNames = {
  37: "ArrowLeft",
  38: "ArrowUp",
  39: "ArrowRight",
  40: "ArrowDown",
  32: "Space"
};

/** @param {number} n */
function constraintRotation(n) {
  return (4 + (n % 4)) % 4;
}

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

  this._rotation = 0;
}

/** @param {TetrominoType} type */
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

/** @param {number} rotation */
Tetromino.prototype.getRotatedLayout = function(rotation) {
  var layout = getTetrominoTypeLayout(this.type);
  var limitedRot = constraintRotation(rotation);
  for (var i = 0; i < limitedRot; i++)
    layout = layout[0].map(function(_, index) { return layout.map(function(row) { return row[index] }).reverse(); });
  return layout;
};

Object.defineProperty(Tetromino.prototype, "layout", {
  get: function() {
    return this.getRotatedLayout(this.rotation);
  }
});

Object.defineProperty(Tetromino.prototype, "tetris", {
  get: function() { return this._tetris; }
});

Object.defineProperty(Tetromino.prototype, "x", {
  get: function() { return this._x; },
  set: function(x) { this.moveTo(x, this.y); }
});

Object.defineProperty(Tetromino.prototype, "y", {
  get: function() { return this._y; },
  set: function(y) { this.moveTo(this.x, y); }
});

Object.defineProperty(Tetromino.prototype, "rotation", {
  get: function() { return this._rotation; },
  set: function(amount) { this.rotateTo(amount); }
});

function Tetris() {
  this.table = document.createElement("table");
  /** @type {HTMLElement[][]} */
  this.rows = [];
  /** @type {Tetromino?} */
  this.fallingTetromino = null;

  this.intervalId = -1;

  this.speed = 1000;
}

Tetris.prototype.init = function() {
  document.body.appendChild(this.table);

  this.createGrid(6, 10);
};

/**
 * @param {number} width 
 * @param {number} height 
 */
Tetris.prototype.createGrid = function(width, height) {
  
  for (var y = 0; y < height; y++) {
    var row = this.table.appendChild(document.createElement("tr"));
    /** @type {HTMLElement[]} */
    var rowData = [];

    for (var x = 0; x < width; x++)
      rowData.push(row.appendChild(document.createElement("td")));

    this.rows.push(rowData);
  }

}
/**
 * @param {TetrominoType} type 
 */
Tetris.prototype.spawn = function(type) {
  var startX = 0, startY = 0;

  this.fallingTetromino = new Tetromino(this, type, startX, startY);
  
  return this.add(this.fallingTetromino);
};

/**
 * @param {Tetromino} tetromino 
 */
Tetris.prototype.add = function(tetromino) {
  try {
    tetromino.forEachElement(function(element) {
      console.log(element.classList + " e " + element.classList.length);
      if (element.classList.length) throw new Error("Tried to move into occupied block");
      element.classList.add(this.type);
    });
  } catch(ex) { console.log(ex); return false; }
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
 * @param {(this: Tetromino, block: boolean, x: number, y: number) => void} callback 
 */
Tetromino.prototype.forEachBlock = function(callback) {
  this.layout.forEach(/** @this {Tetromino} */function(row, y) { row.forEach(/** @this {Tetromino} */function(block, x) { callback.call(this, !!block, x, y); }, this); }, this);
}

/**
 * @param {(this: Tetromino, element: HTMLElement) => void} callback
 */
Tetromino.prototype.forEachElement = function(callback) {
  this.forEachElementAt(callback, this.x, this.y);
}

/**
 * @param {(this: Tetromino, element: HTMLElement) => void} callback 
 * @param {number | undefined} targetX
 * @param {number | undefined} targetY
 */
Tetromino.prototype.forEachElementAt = function(callback, targetX, targetY) {
  this.forEachBlock(function(block, x, y) {
    console.log(y, targetY, x, targetX);
      if (block) callback.call(this, tetris.rows[y + (targetY || this.y)][x + (targetX || this.x)]);
  });
}

/**
 * @param {number} newX 
 * @param {number} newY 
 */
Tetromino.prototype.canMoveToQuick = function(newX, newY) {
  this.tetris.remove(this);
  var tetris = this.tetris;
  var tetromino = this;
  var ok = true;
  try {
    console.log(newX, newY);
    this.forEachElementAt(function(element) {
      var length = element.classList.length;
      if (length) {
        tetris.add(tetromino);
        throw new Error("No length" + element + "oki");
      } 
    }, newX, newY);
  } catch(ex) {
    console.log(ex);
    ok = false;
  }

  return ok;
};

/**
 * @param {number} newX 
 * @param {number} newY 
 */
Tetromino.prototype.canMoveTo = function(newX, newY) {
  var ok = this.canMoveToQuick(newX, newY);
  this.tetris.add(this);
  return ok;
}; 

/**
 * @param {number} x 
 * @param {number} y 
 */
Tetromino.prototype.moveTo = function(x, y) {
  var ok = this.canMoveToQuick(x, y);
  if (ok) {
    this._x = x;
    this._y = y;
  }
  this.tetris.add(this);
  return ok;
};

Tetromino.prototype.fall = function() {
  return this.moveTo(this.x, this.y + 1);
};

Tetromino.prototype.moveLeft = function() { this.x -= 1; };
Tetromino.prototype.moveRight = function() { this.x += 1; };
Tetromino.prototype.rotateLeft = function() { this.rotation -= 1; };
Tetromino.prototype.rotateRight = function() { this.rotation += 1; };

/** @param {number} amount */
Tetromino.prototype.rotateTo = function(amount) {
  this.tetris.remove(this);
  this._rotation = amount;
  return this.tetris.add(this);
}


Tetris.prototype.update = function() {
  var ok = this.fallingTetromino && this.fallingTetromino.fall();
  if (!ok) ok = this.spawnRandom();
  return ok;
};

Tetris.prototype.randomTetrominoType = function() {
  var keys = [];
  for (var key in TetrominoTypes) {
    keys[keys.length] = key;
  }

  var randomKey = keys[Math.floor(Math.random() * keys.length)];
  /** @type {TetrominoType} */
  var randomType = TetrominoTypes[randomKey];

  return randomType;
}

Tetris.prototype.spawnRandom = function() {
  return this.spawn(this.randomTetrominoType());
}

Tetris.prototype.start = function() {

  this.spawnRandom();
  this.intervalId = setInterval(function(/** @type {Tetris} */tetris) {
    if (!tetris.update()) {
      console.warn("Dead.");
      clearInterval(tetris.intervalId);
    }
  }, this.speed, tetris);
}

var tetris = new Tetris();

window.addEventListener("load", function(ev) {
  tetris.init();
  var startButton = document.getElementById("start-button");
  if (startButton) startButton.addEventListener("click", function() {
    tetris.start();
  }, false);
}, false);

window.addEventListener("keydown", function(ev) {
  if (!tetris.fallingTetromino) return;
  switch (ev.key || (Object.keys(KeyNames).indexOf("" + ev.keyCode) != -1 && KeyNames[ev.keyCode])) {
    case "ArrowLeft": tetris.fallingTetromino.moveLeft(); break;
    case "ArrowRight": tetris.fallingTetromino.moveRight(); break;
    case "ArrowDown": tetris.fallingTetromino.y += 1; break;
    case "ArrowUp": tetris.fallingTetromino.rotateLeft(); break;
  }
}, false);
