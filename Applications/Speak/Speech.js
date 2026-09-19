function Speach() {
	
}

Speach.prototype.say = function(msg) {
	var utterance = new SpeechSynthesisUtterance("Hello world");
	speechSynthesis.speak(utterance);
};

var speech = new Speach();