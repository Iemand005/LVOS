

class CanvasMaker {
	createCanvas() {
		const canvas = document.createElement("canvas");

		canvas.setAttribute("layoutsubtree", '');
	}
}

const canvasMaker = new CanvasMaker;