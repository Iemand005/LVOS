
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
 * @param {boolean} [fixed] 
 */
function SudokuCell(row, col, fixed) {
    this.row = row;
    this.col = col;
    this.value = 0;
    this.fixed = !!fixed;

	/** @type {HTMLElement?} */
	this.element = null;
}

SudokuCell.prototype.show = function() {
	if (this.element) this.element.textContent = this.value.toString();
}

function Sudoku() {
	this.width = 9;
	this.height = 9;

	this.grid = new Grid(this.width, this.height);

	/** @type {SudokuCell[]} */
    this.cells = [];

	/** @type {number?} */
	this.selectedNumber = null;
}

Sudoku.prototype.init = function() {
	var self = this;
	this.grid.generate(function(td) {
		var cell = self.addCell();
		cell.element = td;

		if (!cell.fixed) {
			td.onclick = function() {
				td.textContent = cell.value.toString();
			};
		}
	});
};

/**
 * @param {number} row 
 * @param {number} col 
 * @returns {SudokuCell}
 */
Sudoku.prototype.getCell = function(row, col) {
    return this.cells[row * 9 + col];
};

/**
 * @param {number} [row] 
 * @param {number} [col] 
 * @param {boolean} [fixed] 
 * @returns {SudokuCell}
 */
Sudoku.prototype.addCell = function(row, col, fixed) {

	if (!row || !col) {
		var index = this.cells.length;
	
		row = Math.floor(index / 9);
		col = index % 9;
	}

	if (typeof fixed === "undefined") fixed = Math.random() < 0.5;

    var cell = new SudokuCell(row, col, fixed);

    this.cells.push(cell);

    return cell;
};

/**
 * @param {number} row 
 * @param {number} col 
 * @param {number} num 
 * @returns {boolean}
 */
Sudoku.prototype.isValid = function(row, col, num) {

	for (var i = 0; i < 9; i++) {
		if (this.getCell(row, i).value === num) return false;
		if (this.getCell(i, col).value === num) return false;
	}

	var boxRow = Math.floor(row / 3) * 3;
	var boxCol = Math.floor(col / 3) * 3;

	for (var r = 0; r < 3; r++)
		for (var c = 0; c < 3; c++)
			if (this.getCell(boxRow + r, boxCol + c).value === num)
				return false;

	return true;
};

/**
 * @param {number} index 
 * @returns {boolean}
 */
Sudoku.prototype.fill = function(index) {

	if (index >= 81) return true;

	var row = Math.floor(index / 9);
	var col = index % 9;
	var cell = this.getCell(row, col);

	var nums = [1,2,3,4,5,6,7,8,9];

	for (var i = nums.length - 1; i > 0; i--) {
		var j = Math.floor(Math.random() * (i + 1));
		[nums[i], nums[j]] = [nums[j], nums[i]];
	}

	for (var k = 0; k < nums.length; k++) {
		var num = nums[k];

		if (this.isValid(row, col, num)) {
			cell.value = num;

			if (this.fill(index + 1)) {
				if (cell.fixed) cell.show();
				return true;
			}

			cell.value = 0;
		}
	}

	return false;
};

Sudoku.prototype.createNumberPad = function() {
	var container = document.createElement("div");

	for (var i = 1; i <= 9; i++) {

		var label = document.createElement("label");

		var radio = document.createElement("input");
		radio.type = "radio";
		radio.name = "sudoku-number";
		radio.value = i.toString();

		label.appendChild(radio);
		label.appendChild(document.createTextNode(i.toString()));

		container.appendChild(label);
	}

	document.body.appendChild(container);
};


var sudoku = new Sudoku();

window.onload = function() {

	sudoku.init();
	sudoku.fill(0);
	sudoku.createNumberPad();
};