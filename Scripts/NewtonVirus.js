

function NewtonManager() {
	this.lastTime = 0;
}

NewtonManager.prototype.start = function () {
	requestAnimationFrame(this.start);
};anim

NewtonManager.prototype.step = function() {
	var currentTime = Date.now();
	var deltaTime = this.lastTime - currentTime;
	this.lastTime = currentTime;


};