

function NewtonManager() {
	/** @type {DOMHighResTimeStamp} */
	this.lastTime = 0;
}

NewtonManager.prototype.start = function () {
	requestAnimationFrame(this.loop);
};

/** @param {DOMHighResTimeStamp} time */
NewtonManager.prototype.loop = function (time) {
	this.step(time);
	requestAnimationFrame(this.loop);
};

/** @param {DOMHighResTimeStamp} time */
NewtonManager.prototype.step = function(time) {
	var currentTime = time;
	var deltaTime = this.lastTime - currentTime;
	this.lastTime = currentTime;

	windowManager.forEachWindow(this, function (window) {})wy
};