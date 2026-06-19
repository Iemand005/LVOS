
/**
 * @param {number} width 
 * @param {number} height 
 */
function Grid(width, height) {
	this.width = width;
	this.height = height;

	this.cells = [];
}

Grid.prototype.generate = function() {
	var table = document.createElement("table");

	for (var i = 0; i < this.height; i++) {
		var row = document.createElement("tr");

		for (var j = 0; j < this.width; j++) {
			var cell = document.createElement("td");

			this.cells.push(cell);
		}
	}
};

function Sudoku() {

}