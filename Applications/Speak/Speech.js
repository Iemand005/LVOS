function Speech() {
	this.volume = 1;
	this.speed = 1;
	this.pitch = 1;
}

Speech.prototype.say = function(msg) {
	var utterance = new SpeechSynthesisUtterance(msg);
	utterance.rate = this.speed;
	utterance.volume = this.volume;
	utterance.pitch = this.pitch;
	speechSynthesis.speak(utterance);
};

var speech = new Speech;