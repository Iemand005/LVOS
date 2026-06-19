
/**
 * @param {number} width 
 * @param {number} height 
 */
function Grid(width, height) {
	this.width = width;
	this.height = height;

	/** @type {HTMLElement[]} */
	this.cells = [];
}
/**
 * 
 * @param {(cell:HTMLElement)=>void} [callback] 
 */
Grid.prototype.generate = function(callback) {
	var table = document.createElement("table");

	for (var i = 0; i < this.height; i++) {
		var row = document.createElement("tr");

		for (var j = 0; j < this.width; j++) {
			var cell = document.createElement("td");

			this.cells.push(cell);

			if (callback) callback(cell);

			row.appendChild(cell);
		}

		table.appendChild(row);
	}

	document.body.appendChild(table);
};

/**
 * @param {number} row 
 * @param {number} col 
 */
function SudokuCell(row, col) {
    this.row = row;
    this.col = col;
    this.value = 0;
    this.fixed = false;
}

function Sudoku() {
	this.grid = new Grid(9, 9);

	/** @type {SudokuCell[]} */
    this.cells = [];
}

Sudoku.prototype.init = function() {
	this.grid.generate();
};
/**
 * @param {number} row 
 * @param {number} col 
 * @returns {SudokuCell}
 */
Sudoku.prototype.getCell = function(row, col) {
    return this.cells[row * 9 + col];
};

Sudoku.prototype.addCell = function() {
    var index = this.cells.length;

    var row = Math.floor(index / 9);
    var col = index % 9;

    var cell = new SudokuCell(row, col);

    this.cells.push(cell);

    return cell;
};


var sudoku = new Sudoku();

window.onload = function() {

	sudoku.init();
};