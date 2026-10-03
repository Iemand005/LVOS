

class CanvasMaker {

	canvas = document.createElement("canvas");;

	createCanvas() {
		const canvas = document.createElement("canvas");

		canvas.setAttribute("layoutsubtree", '');
	}
}

const canvasMaker = new CanvasMaker;