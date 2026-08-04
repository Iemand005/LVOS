

function NewtonManager() {
	/** @type {DOMHighResTimeStamp} */
	this.lastTime = 0;

	this.gravity = 0.2;
}

NewtonManager.prototype.start = function () {
	requestAnimationFrame(this.loop.bind(this));
};

/** @param {DOMHighResTimeStamp} time */
NewtonManager.prototype.loop = function (time) {
	this.step(time);
	requestAnimationFrame(this.loop.bind(this));
};

/** @param {DOMHighResTimeStamp} time */
NewtonManager.prototype.step = function(time) {
	var currentTime = time;
	var deltaTime = this.lastTime - currentTime;
	this.lastTime = currentTime;

	var self = this;

	windowManager.forEachWindow(function (window) {
		if (window.dragging) return;

		if (!window.velocity) window.velocity = new Vector();
		window.velocity.y -= self.gravity * deltaTime;
		// window.velocity.x -= deltaTime;
		var lastY = window.y;

		window.y += window.velocity.y;
		window.x += window.velocity.x;

		if (window.y == lastY) window.velocity.y = 0;
	});
};