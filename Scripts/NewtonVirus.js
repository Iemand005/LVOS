

function NewtonManager() {
	this.lastTime = 0;
}

NewtonManager.prototype.start = function () {
	requestAnimationFrame(this.loop);
};
// anim8

NewtonManager.prototype.loop = function () {
	requestAnimationFrame(this.loop);
}

NewtonManager.prototype.step = function() {
	var currentTime = Date.now();
	var deltaTime = this.lastTime - currentTime;
	this.lastTime = currentTime;


};