"use strict";

var message = document.getElementById("message");
var speakButton = document.getElementById("speak");
var volume = document.getElementById("volume");
var speed = document.getElementById("speed");
var pitch = document.getElementById("pitch");
var volumeOut = document.getElementById("volume-out");
var speedOut = document.getElementById("speed-out");
var pitchOut = document.getElementById("pitch-out");

speakButton.addEventListener("click", function () {
	speech.say(message.value);
}, false);

volume.addEventListener("input", function () {
	speech.volume = Number(volume.value);
	volumeOut.value = volume.value;
}, false);

speed.addEventListener("input", function () {
	speech.speed = Number(speed.value);
	speedOut.value = speed.value;
}, false);

pitch.addEventListener("input", function () {
	speech.pitch = Number(pitch.value);
	pitchOut.value = pitch.value;
}, false);

volumeOut.value = volume.value;
speedOut.value = speed.value;
pitchOut.value = pitch.value;

LVMessenger.registerThemeChangeHandler();