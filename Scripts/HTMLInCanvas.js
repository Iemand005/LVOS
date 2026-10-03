

class CanvasMaker {

	canvas = document.createElement("canvas");;

	/** @param {HTMLElement} element */
	createCanvas(element) {

		this.canvas.setAttribute("layoutsubtree", '');
		this.canvas.appendChild(element);
		document.body.appendChild(this.canvas);
	}
}

const canvasMaker = new CanvasMaker;