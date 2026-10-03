

class CanvasMaker {

	canvas = document.createElement("canvas");;

	createCanvas() {

		this.canvas.setAttribute("layoutsubtree", '');
		document.body.appendChild(this.canvas);
	}
}

const canvasMaker = new CanvasMaker;