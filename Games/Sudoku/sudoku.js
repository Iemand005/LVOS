
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

			callback(cell);

			row.appendChild(cell);
		}

		table.appendChild(row);
	}

	document.body.appendChild(table);
};

function Sudoku() {
	this.grid = new Grid(9, 9);
}

Sudoku.prototype.init = function() {
	this.grid.generate();
};

var sudoku = new Sudoku();

window.onload = function() {

	sudoku.init();
};