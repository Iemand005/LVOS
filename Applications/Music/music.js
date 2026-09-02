// Scripts for the front end of the music application
// Lasse Lauwerys © 2023

'use strict';

{
var frequencies = 128;

var micButton = document.getElementById("mic");
var dispAudioBtn = document.getElementById("display-audio");
var auraButton = document.getElementById("aura-button");
var virtualAudio = document.createElement("audio");
var file = document.getElementById("file");
var audio = document.getElementsByTagName("audio")[0];
var visualiser = document.getElementById("visualizer");
var fullscreen = document.getElementById("fullscreen");
var volume = document.getElementById("volume");
var seek = document.getElementById("seek");
var play = document.getElementById("play");
var options = document.getElementById("options");
var seekOutput = document.getElementById("seek-output");
var volumeOutput = document.getElementById("volume-output");
var fft = document.getElementById("fft");
var visualiserOption = document.getElementById("style");

var audioVisualiser = new AudioVisualizer(frequencies);

var circular = true;
var clear = true;

const media = new Media;
/** @type {Aura | null} */
let aura = null;

if (options instanceof HTMLFormElement) options.onsubmit = function(ev) {
	ev.preventDefault();
};

if (typeof Aura !== "undefined") try {
	aura = new Aura;
} catch (ex) { console.warn("WebAura not supported:", ex); }

const THROTTLE_MS = 20;

const colorTitlebar = false;


// ── Beat Detector ────────────────────────────────────────────────
function BeatDetector() {
	this.energyHistory = new Float32Array(43);
	this.historyIndex = 0;
	this.beatCooldown = 0;
	this.lastBeatTime = 0;
	this.bpmHistory = [];
	this.detectedBPM = 0;
	this.isBeat = false;
	this.beatIntensity = 0;
	this.smoothBPM = 0;
}

BeatDetector.prototype.update = function(freqData, time) {
	var totalEnergy = 0;
	var lowEnergy = 0;
	var lowEnd = Math.min(Math.floor(freqData.length * 0.15), freqData.length);
	for (var i = 0; i < lowEnd; i++) {
		var norm = freqData[i] / 255;
		lowEnergy += norm * norm;
	}
	lowEnergy /= lowEnd;

	for (var i = 0; i < freqData.length; i++) {
		var norm = freqData[i] / 255;
		totalEnergy += norm * norm;
	}
	totalEnergy /= freqData.length;

	this.energyHistory[this.historyIndex] = totalEnergy;
	this.historyIndex = (this.historyIndex + 1) % this.energyHistory.length;

	var sum = 0;
	for (var i = 0; i < this.energyHistory.length; i++) sum += this.energyHistory[i];
	var avgEnergy = sum / this.energyHistory.length;

	var variance = 0;
	for (var i = 0; i < this.energyHistory.length; i++) {
		var diff = this.energyHistory[i] - avgEnergy;
		variance += diff * diff;
	}
	variance /= this.energyHistory.length;
	var stdDev = Math.sqrt(variance);

	var threshold = avgEnergy + stdDev * 1.2 + 0.02;
	var beatDetected = totalEnergy > threshold && lowEnergy > avgEnergy * 1.1;
	var cooldownMs = 250;

	this.isBeat = false;
	if (beatDetected && this.beatCooldown <= 0) {
		this.isBeat = true;
		this.beatIntensity = 1.0;
		this.beatCooldown = cooldownMs;

		if (this.lastBeatTime > 0) {
			var interval = time - this.lastBeatTime;
			if (interval > 250 && interval < 2000) {
				var bpm = 60000 / interval;
				this.bpmHistory.push(bpm);
				if (this.bpmHistory.length > 30) this.bpmHistory.shift();

				if (this.bpmHistory.length >= 4) {
					var bSum = 0;
					for (var i = 0; i < this.bpmHistory.length; i++) bSum += this.bpmHistory[i];
					this.detectedBPM = bSum / this.bpmHistory.length;
					this.smoothBPM += (this.detectedBPM - this.smoothBPM) * 0.15;
				}
			}
		}
		this.lastBeatTime = time;
	}

	if (this.beatCooldown > 0) this.beatCooldown -= 16.67;
	this.beatIntensity *= 0.92;
	if (this.beatIntensity < 0.001) this.beatIntensity = 0;

	return { isBeat: this.isBeat, beatIntensity: this.beatIntensity, bpm: this.smoothBPM };
};

var beatDetector = new BeatDetector();


// ── MusicApp ────────────────────────────────────────────────────

/** @param {HTMLCanvasElement} visualizerElement */
function MusicApp(visualizerElement) {
	this.graphics = new Graphics2D(visualizerElement);
	console.log("graphics canvas found:", this.graphics.ctx);

	/** @type {"bars" | "circle" | "cake" | "intensity" | "beatpulse" | "spiral" | "waveform"} */
	this.visualizer = "bars";

	this.prevTime = 0;
	this.rotation = 0;

	// Fix blurry canvas: scale backing store to devicePixelRatio
	var self = this;
	var container = visualizerElement.parentElement || document.body;
	function fitCanvas() {
		var rect = container.getBoundingClientRect();
		self.graphics.resize(rect.width, rect.height);
	}
	fitCanvas();
	window.addEventListener("resize", fitCanvas);
}

window.musicApp = null;

/**
	* Setter used by the wasm Aura bridge: the game engine forwards a colour
	* through Module.onAuraColor; this pushes it to the same WebAura instance the
	* music app drives.
	* @param {number} r 0-255
	* @param {number} g 0-255
	* @param {number} b 0-255
	*/
MusicApp.prototype.setAuraColor = function (r, g, b) {
	if (!aura || !aura.device) return;
	aura.setColor(r, g, b).catch(function () {});
};

if (visualiser instanceof HTMLCanvasElement) {
	window.musicApp = new MusicApp(visualiser);
}


if (micButton)
micButton.onclick = function(ev){
	media.getMicrophoneStream(function(stream) {
		audioVisualiser.initializeWithMediaStream(stream);
		startAnimation();
	});
}

if (dispAudioBtn) dispAudioBtn.onclick = function() {
	const displayStream = media.getDisplayStream();
	if (displayStream) {
		displayStream.then(function(stream) {
			audioVisualiser.initializeWithMediaStream(stream);
			startAnimation();
		})
	}
}

if (auraButton) auraButton.onclick = function(){
	aura && aura.init(true).then(function() {
		console.log("Aura loaded!");
	});
};

if (aura) aura.init();

function localFullscreen() {
	if (document.body.requestFullscreen) document.body.requestFullscreen();
	else if (document.body.msRequestFullscreen) document.body.msRequestFullscreen();
}

if (fullscreen) fullscreen.onclick = function(){
	localFullscreen();
	LVMessenger.broadcastToParent("launchOverlay", "", "music");
}

/** @param {number} intensity */
function getRainbowRGB(intensity) {
	const t = intensity % 1;
	const angle = t * 2 * Math.PI;
	const r = Math.sin(angle) * 127 + 128;
	const g = Math.sin(angle + (2 * Math.PI / 3)) * 127 + 128;
	const b = Math.sin(angle + (4 * Math.PI / 3)) * 127 + 128;
	return { r: Math.round(r), g: Math.round(g), b: Math.round(b) };
}

/**
 * Blend a colour towards white by `amount` (0..1).
 * @param {{r:number,g:number,b:number}} rgb
 * @param {number} amount
 */
function flashWhite(rgb, amount) {
	var a = Math.max(0, Math.min(1, amount));
	return {
		r: Math.round(rgb.r + (255 - rgb.r) * a),
		g: Math.round(rgb.g + (255 - rgb.g) * a),
		b: Math.round(rgb.b + (255 - rgb.b) * a)
	};
}

let pipWindow = null;

function openCanvasPip() {
	if (!('documentPictureInPicture' in window) || !window.documentPictureInPicture) {
		console.warn('Document Picture-in-Picture not supported.');
		return;
	}

	if (window.documentPictureInPicture.window) {
		window.documentPictureInPicture.window.close();
		return;
	}

	const visualiserCanvasId = window.musicApp.visualizer === "cake" ? "canvas" : "visualizer";
	const visualiser = document.getElementById(visualiserCanvasId);

	if (!(visualiser instanceof HTMLCanvasElement)) return;

	const originalParent = visualiser.parentNode;

	window.documentPictureInPicture.requestWindow({
		width: visualiser.width,
		height: visualiser.height,
	}).then(function(/** @type {Window} */pipWindow) {
		const doc = pipWindow.document;
		let html = doc.documentElement;
		if (!html) { html = doc.createElement('html'); doc.appendChild(html); }
		let body = doc.body;
		if (!body) { body = doc.createElement('body'); html.appendChild(body); }
		let head = doc.head;
		if (!head) { head = doc.createElement('head'); html.appendChild(head); }

		const styleEl = doc.createElement('style');
		styleEl.textContent =
			'html{-webkit-text-size-adjust:none}' +
			'html,body{width:100%!important;height:100%!important;' +
			'margin:0!important;padding:0!important;overflow:hidden!important;' +
			'position:relative!important;background:#000!important}';
		head.appendChild(styleEl);

		html.style.width = '100%';
		html.style.height = '100%';
		body.style.width = '100%';
		body.style.height = '100%';
		body.style.margin = '0';
		body.style.padding = '0';
		body.style.overflow = 'hidden';
		body.style.position = 'relative';
		body.style.background = '#000';

		visualiser.style.position = 'absolute';
		visualiser.style.top = '0';
		visualiser.style.left = '0';
		visualiser.style.width = '100%';
		visualiser.style.height = '100%';

		function fitCanvas() {
			if (!(visualiser instanceof HTMLCanvasElement)) return;
			const dpr = pipWindow.devicePixelRatio || 1;
			visualiser.width = Math.round(body.clientWidth * dpr);
			visualiser.height = Math.round(body.clientHeight * dpr);
		}
		fitCanvas();
		pipWindow.addEventListener('resize', fitCanvas);

		body.appendChild(visualiser);

		pipWindow.addEventListener('pagehide', function() {
			pipWindow.removeEventListener('resize', fitCanvas);
			if (originalParent && visualiser.parentNode !== originalParent)
				originalParent.appendChild(visualiser);
		}, { once: true });
	}).catch(function(ex) {
		LVMessenger.broadcastToParent("pip", {id: visualiser.id}, "music");
	});
}

const pipBtn = document.getElementById("pip-button");
if (pipBtn) pipBtn.onclick = openCanvasPip;
/** @param {number} c */
function componentToHex(c) {
	var hex = c.toString(16);
	return hex.length == 1 ? "0" + hex : hex;
}
/**
 * @param {number} r
 * @param {number} g
 * @param {number} b
 */
function rgbToHex(r, g, b) {
	return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

let lastUpdateTime = 0;

/**
	* Extension: hand the browser analyser's bins over to the Emscripten module so
	* the wasm renderer (Cake) draws from the exact same data as the 2D bars/circle.
	* @param {Uint8Array} freqData
	* @param {Uint8Array} timeData
	*/
MusicApp.prototype.pushBinsToWasm = function (freqData, timeData) {
	var m = typeof Module !== 'undefined' ? Module : null;
	if (!m) return;
	if (typeof m._FE_AudioSetFrequencyBins !== 'function' ||
		typeof m._FE_AudioSetTimeDomain !== 'function' ||
		typeof m._malloc !== 'function') return;

	var n = freqData.length, nt = timeData.length;
	if (this._wasmBinsPtr === undefined || this._wasmBinsCap < n) {
		if (typeof this._wasmBinsPtr === 'number') m._free(this._wasmBinsPtr);
		this._wasmBinsPtr = m._malloc(n * 4);
		this._wasmBinsCap = n;
	}
	if (this._wasmTimePtr === undefined || this._wasmTimeCap < nt) {
		if (typeof this._wasmTimePtr === 'number') m._free(this._wasmTimePtr);
		this._wasmTimePtr = m._malloc(nt * 4);
		this._wasmTimeCap = nt;
	}
	if (this._wasmBinsPtr === 0 || this._wasmTimePtr === 0) return;

	var heap = m.HEAPF32;
	if (!heap) return;

	var i, base = this._wasmBinsPtr >> 2;
	for (i = 0; i < n; i++) heap[base + i] = freqData[i] / 255;
	base = this._wasmTimePtr >> 2;
	for (i = 0; i < nt; i++) heap[base + i] = (timeData[i] - 128) / 128;

	m._FE_AudioSetFrequencyBins(this._wasmBinsPtr, n);
	m._FE_AudioSetTimeDomain(this._wasmTimePtr, nt);
};


// ── Visualizer: bars (improved) ─────────────────────────────────
MusicApp.prototype.drawBars = function(ctx, width, height, freqData, count, rgb) {
	var barWidth = width / count;
	for (var i = 0; i < freqData.length; i++) {
		var amp = freqData[i];
		var barH = (height / 256) * amp;
		var x = i * barWidth;

		var grad = ctx.createLinearGradient(x, height, x, height - barH);
		var bright = amp / 255;
		var r = Math.round(rgb.r + (255 - rgb.r) * bright * 0.5);
		var g = Math.round(rgb.g + (255 - rgb.g) * bright * 0.5);
		var b = Math.round(rgb.b + (255 - rgb.b) * bright * 0.5);
		grad.addColorStop(0, "rgb(" + rgb.r + "," + rgb.g + "," + rgb.b + ")");
		grad.addColorStop(1, "rgb(" + r + "," + g + "," + b + ")");

		ctx.fillStyle = grad;
		ctx.shadowColor = "rgb(" + rgb.r + "," + rgb.g + "," + rgb.b + ")";
		ctx.shadowBlur = 8;
		ctx.fillRect(x + 1, height, barWidth - 2, -barH);

		if (amp > 200) {
			ctx.shadowBlur = 20;
			ctx.fillRect(x + 1, height, barWidth - 2, -barH);
		}
	}
	ctx.shadowBlur = 0;
};

// ── Visualizer: circle (improved) ───────────────────────────────
MusicApp.prototype.drawCircle = function(ctx, width, height, freqData, timeData, count, rgb) {
	var cX = width / 2;
	var cY = height / 2;
	var rad = 0;
	var inc = Math.PI * 2 / count;

	ctx.beginPath();
	for (var i = 0; i < timeData.length; i++) {
		var amp = timeData[i];
		var x = amp * Math.cos(rad) + cX;
		var y = amp * Math.sin(rad) + cY;
		if (i === 0) ctx.moveTo(x, y);
		else ctx.lineTo(x, y);
		rad += inc;
	}
	ctx.closePath();
	ctx.strokeStyle = "rgb(" + rgb.r + "," + rgb.g + "," + rgb.b + ")";
	ctx.lineWidth = 3;
	ctx.shadowColor = "rgb(" + rgb.r + "," + rgb.g + "," + rgb.b + ")";
	ctx.shadowBlur = 15;
	ctx.stroke();

	for (var i = 0; i < timeData.length; i++) {
		rad = i * inc;
		var amp = timeData[i];
		var x = amp * Math.cos(rad) + cX;
		var y = amp * Math.sin(rad) + cY;
		var intensity = freqData[i] / 255;
		ctx.beginPath();
		ctx.fillStyle = "rgb(" + rgb.r + "," + rgb.g + "," + rgb.b + ")";
		ctx.arc(x, y, 2 + intensity * 4, 0, Math.PI * 2);
		ctx.fill();
	}
	ctx.shadowBlur = 0;

	var innerRad = 40;
	for (var i = 0; i < freqData.length; i++) {
		rad = i * inc;
		var amp = freqData[i] / 255;
		var x1 = innerRad * Math.cos(rad) + cX;
		var y1 = innerRad * Math.sin(rad) + cY;
		var x2 = (innerRad + amp * 80) * Math.cos(rad) + cX;
		var y2 = (innerRad + amp * 80) * Math.sin(rad) + cY;
		ctx.beginPath();
		ctx.moveTo(x1, y1);
		ctx.lineTo(x2, y2);
		ctx.strokeStyle = "rgba(" + rgb.r + "," + rgb.g + "," + rgb.b + "," + (0.3 + amp * 0.7) + ")";
		ctx.lineWidth = 2;
		ctx.stroke();
	}
};

// ── Visualizer: intensity flash ─────────────────────────────────
MusicApp.prototype.drawIntensity = function(ctx, width, height, freqData, count, rgb, intensity, time) {
	var flashAmount = Math.pow(intensity / 255, 1.5) * 1.2;

	var bgBrightness = Math.floor(intensity / 255 * 20);
	ctx.fillStyle = "rgb(" + bgBrightness + "," + bgBrightness + "," + bgBrightness + ")";
	ctx.fillRect(0, 0, width, height);

	var barWidth = width / count;
	var centerY = height * 0.55;

	for (var i = 0; i < freqData.length; i++) {
		var amp = freqData[i];
		var barH = (height * 0.45 / 256) * amp;
		var x = i * barWidth;
		var bright = amp / 255;

		var flashBar = flashWhite(rgb, bright * flashAmount * 1.3);
		var grad = ctx.createLinearGradient(x, centerY, x, centerY - barH);
		grad.addColorStop(0, "rgb(" + flashBar.r + "," + flashBar.g + "," + flashBar.b + ")");
		grad.addColorStop(0.5, "rgb(255,255,255)");
		grad.addColorStop(1, "rgba(255,255,255,0.6)");

		ctx.fillStyle = grad;
		ctx.shadowColor = "rgb(255,255,255)";
		ctx.shadowBlur = 10 + flashAmount * 30;
		ctx.fillRect(x, centerY, barWidth - 1, -barH);

		var reflH = barH * 0.4;
		var reflGrad = ctx.createLinearGradient(x, centerY, x, centerY + reflH);
		reflGrad.addColorStop(0, "rgba(" + flashBar.r + "," + flashBar.g + "," + flashBar.b + ",0.3)");
		reflGrad.addColorStop(1, "rgba(" + flashBar.r + "," + flashBar.g + "," + flashBar.b + ",0)");
		ctx.fillStyle = reflGrad;
		ctx.fillRect(x, centerY, barWidth - 1, reflH);
	}
	ctx.shadowBlur = 0;

	if (flashAmount > 0.3) {
		var glowAlpha = (flashAmount - 0.3) * 0.4;
		ctx.fillStyle = "rgba(255,255,255," + glowAlpha + ")";
		ctx.fillRect(0, 0, width, height);
	}
};

// ── Visualizer: beat pulse ──────────────────────────────────────
MusicApp.prototype.drawBeatPulse = function(ctx, width, height, freqData, count, rgb, beatInfo, time) {
	var cX = width / 2;
	var cY = height / 2;

	var bgBright = Math.floor(beatInfo.beatIntensity * 15);
	ctx.fillStyle = "rgb(" + bgBright + "," + bgBright + "," + bgBright + ")";
	ctx.fillRect(0, 0, width, height);

	var avgFreq = 0;
	for (var i = 0; i < freqData.length; i++) avgFreq += freqData[i];
	avgFreq /= freqData.length * 255;

	var baseRadius = Math.min(width, height) * 0.08 + avgFreq * Math.min(width, height) * 0.12;
	var glowRadius = baseRadius + beatInfo.beatIntensity * 80;

	var glowGrad = ctx.createRadialGradient(cX, cY, baseRadius * 0.5, cX, cY, glowRadius);
	glowGrad.addColorStop(0, "rgba(255,255,255," + (0.2 + beatInfo.beatIntensity * 0.6) + ")");
	glowGrad.addColorStop(0.4, "rgba(" + rgb.r + "," + rgb.g + "," + rgb.b + "," + (0.3 + beatInfo.beatIntensity * 0.5) + ")");
	glowGrad.addColorStop(1, "rgba(" + rgb.r + "," + rgb.g + "," + rgb.b + ",0)");
	ctx.fillStyle = glowGrad;
	ctx.beginPath();
	ctx.arc(cX, cY, glowRadius, 0, Math.PI * 2);
	ctx.fill();

	var numRings = 3 + Math.floor(avgFreq * 4);
	for (var i = 0; i < numRings; i++) {
		var ringPhase = (time * 0.001 + i * 0.8) % 4;
		var ringR = baseRadius + ringPhase * Math.min(width, height) * 0.15;
		var ringAlpha = (1 - ringPhase / 4) * 0.5 * (0.5 + beatInfo.beatIntensity * 0.5);
		ctx.beginPath();
		ctx.arc(cX, cY, ringR, 0, Math.PI * 2);
		ctx.strokeStyle = "rgba(" + rgb.r + "," + rgb.g + "," + rgb.b + "," + ringAlpha + ")";
		ctx.lineWidth = 2 + beatInfo.beatIntensity * 4;
		ctx.stroke();
	}

	var freqRadius = baseRadius * 1.5;
	var freqInc = Math.PI * 2 / freqData.length;
	for (var i = 0; i < freqData.length; i++) {
		var amp = freqData[i] / 255;
		var angle = i * freqInc - Math.PI / 2;
		var innerR = freqRadius;
		var outerR = freqRadius + amp * Math.min(width, height) * 0.35;
		var x1 = cX + innerR * Math.cos(angle);
		var y1 = cY + innerR * Math.sin(angle);
		var x2 = cX + outerR * Math.cos(angle);
		var y2 = cY + outerR * Math.sin(angle);

		var segRGB = getRainbowRGB(this.rotation + i / freqData.length * 0.2);
		var brightness = 0.5 + beatInfo.beatIntensity * 0.5;
		ctx.beginPath();
		ctx.moveTo(x1, y1);
		ctx.lineTo(x2, y2);
		ctx.strokeStyle = "rgba(" + segRGB.r + "," + segRGB.g + "," + segRGB.b + "," + brightness + ")";
		ctx.lineWidth = 2;
		ctx.stroke();
	}

	if (beatInfo.bpm > 0) {
		ctx.fillStyle = "rgba(255,255,255,0.7)";
		ctx.font = "14px monospace";
		ctx.textAlign = "right";
		ctx.fillText(Math.round(beatInfo.bpm) + " BPM", width - 15, 25);
	}
};

// ── Visualizer: spiral ──────────────────────────────────────────
MusicApp.prototype.drawSpiral = function(ctx, width, height, freqData, count, rgb, time) {
	var cX = width / 2;
	var cY = height / 2;
	var maxR = Math.min(width, height) * 0.45;

	ctx.fillStyle = "rgba(0,0,0,0.15)";
	ctx.fillRect(0, 0, width, height);

	var turns = 3 + freqData.length / count * 2;
	var totalAngle = turns * Math.PI * 2;
	var spiralRotation = time * 0.0005;

	for (var i = 0; i < freqData.length; i++) {
		var t = i / freqData.length;
		var angle = t * totalAngle + spiralRotation;
		var baseR = t * maxR;
		var amp = freqData[i] / 255;
		var r = baseR + amp * 25;

		var x = cX + r * Math.cos(angle);
		var y = cY + r * Math.sin(angle);

		var segRGB = getRainbowRGB(this.rotation + t * 2);
		var flashRGB = flashWhite(segRGB, amp * 0.6);
		var size = 2 + amp * 8;

		ctx.beginPath();
		ctx.arc(x, y, size, 0, Math.PI * 2);
		ctx.fillStyle = "rgb(" + flashRGB.r + "," + flashRGB.g + "," + flashRGB.b + ")";
		ctx.shadowColor = "rgb(" + flashRGB.r + "," + flashRGB.g + "," + flashRGB.b + ")";
		ctx.shadowBlur = 5 + amp * 15;
		ctx.fill();
	}
	ctx.shadowBlur = 0;

	for (var i = 1; i < freqData.length; i++) {
		var t1 = (i - 1) / freqData.length;
		var t2 = i / freqData.length;
		var angle1 = t1 * totalAngle + spiralRotation;
		var angle2 = t2 * totalAngle + spiralRotation;
		var amp1 = freqData[i - 1] / 255;
		var amp2 = freqData[i] / 255;
		var r1 = t1 * maxR + amp1 * 25;
		var r2 = t2 * maxR + amp2 * 25;

		var x1 = cX + r1 * Math.cos(angle1);
		var y1 = cY + r1 * Math.sin(angle1);
		var x2 = cX + r2 * Math.cos(angle2);
		var y2 = cY + r2 * Math.sin(angle2);

		var segRGB = getRainbowRGB(this.rotation + t1 * 2);
		ctx.beginPath();
		ctx.moveTo(x1, y1);
		ctx.lineTo(x2, y2);
		ctx.strokeStyle = "rgba(" + segRGB.r + "," + segRGB.g + "," + segRGB.b + "," + (0.2 + amp2 * 0.5) + ")";
		ctx.lineWidth = 1 + amp2 * 3;
		ctx.stroke();
	}
};

// ── Visualizer: waveform ────────────────────────────────────────
MusicApp.prototype.drawWaveform = function(ctx, width, height, freqData, timeData, count, rgb, time) {
	var centerY = height / 2;

	ctx.fillStyle = "rgba(0,0,0,0.2)";
	ctx.fillRect(0, 0, width, height);

	var avgFreq = 0;
	for (var i = 0; i < freqData.length; i++) avgFreq += freqData[i];
	avgFreq /= freqData.length * 255;

	var lineWidth = 2 + avgFreq * 6;
	var points = [];

	for (var i = 0; i < timeData.length; i++) {
		var x = (i / (timeData.length - 1)) * width;
		var amp = (timeData[i] - 128) / 128;
		var y = centerY + amp * height * 0.4;
		points.push({ x: x, y: y });
	}

	if (points.length < 2) return;

	ctx.beginPath();
	ctx.moveTo(points[0].x, points[0].y);
	for (var i = 1; i < points.length - 1; i++) {
		var cpX = (points[i].x + points[i + 1].x) / 2;
		var cpY = (points[i].y + points[i + 1].y) / 2;
		ctx.quadraticCurveTo(points[i].x, points[i].y, cpX, cpY);
	}
	ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);

	var grad = ctx.createLinearGradient(0, 0, width, 0);
	for (var i = 0; i <= 10; i++) {
		var seg = getRainbowRGB(this.rotation + i / 10);
		grad.addColorStop(i / 10, "rgb(" + seg.r + "," + seg.g + "," + seg.b + ")");
	}

	ctx.strokeStyle = grad;
	ctx.lineWidth = lineWidth;
	ctx.shadowColor = "rgb(" + rgb.r + "," + rgb.g + "," + rgb.b + ")";
	ctx.shadowBlur = 20;
	ctx.stroke();

	ctx.beginPath();
	ctx.moveTo(points[0].x, points[0].y);
	for (var i = 1; i < points.length - 1; i++) {
		var cpX = (points[i].x + points[i + 1].x) / 2;
		var cpY = (points[i].y + points[i + 1].y) / 2;
		ctx.quadraticCurveTo(points[i].x, points[i].y, cpX, cpY);
	}
	ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);

	var reflGrad = ctx.createLinearGradient(0, centerY, 0, height);
	reflGrad.addColorStop(0, "rgba(" + rgb.r + "," + rgb.g + "," + rgb.b + ",0.3)");
	reflGrad.addColorStop(1, "rgba(" + rgb.r + "," + rgb.g + "," + rgb.b + ",0)");
	ctx.strokeStyle = reflGrad;
	ctx.lineWidth = lineWidth * 0.5;
	ctx.shadowBlur = 10;
	ctx.stroke();
	ctx.shadowBlur = 0;

	for (var i = 0; i < freqData.length; i += 3) {
		var t = i / freqData.length;
		var amp = freqData[i] / 255;
		var x = t * width;
		var freqY = centerY - height * 0.3 - amp * height * 0.15;
		var segRGB = getRainbowRGB(this.rotation + t);
		var flashRGB = flashWhite(segRGB, amp * 0.5);
		ctx.beginPath();
		ctx.arc(x, freqY, 1.5 + amp * 3, 0, Math.PI * 2);
		ctx.fillStyle = "rgba(" + flashRGB.r + "," + flashRGB.g + "," + flashRGB.b + "," + (0.3 + amp * 0.7) + ")";
		ctx.fill();
	}
};


// ── Main render loop ────────────────────────────────────────────
/** @param {number} time */
MusicApp.prototype.animateFrame = function(time) {

	const deltaTime = time - this.prevTime;

	this.rotation += deltaTime * 0.00001;

	window.requestAnimationFrame(this.animateFrame.bind(musicApp));
	if (!this.graphics.ctx) return;

	const freqData = audioVisualiser.frequencyData;
	const timeData = audioVisualiser.timeDomainData;
	this.pushBinsToWasm(freqData, timeData);
	if (this.visualizer === "cake") { this.prevTime = time; return; }

	const ctx = this.graphics.ctx;
	const width = ctx.canvas.width;
	const height = ctx.canvas.height;

	if (clear) {
		this.graphics.ctx.clearRect(0, 0, width, height);
	} else {
		ctx.fillStyle = "#FF000099";
		ctx.fillRect(0, 0, width, height);
	}
	refresh();
	seek.value = audio.currentTime;

	const count = audioVisualiser.frequencyBinCount;

	var total = 0;
	for (let i = 0; i < freqData.length; i++)
		total += freqData[i];
	const averageIntensity = total / count;

	this.rotation += (Math.pow(2, averageIntensity / 255 * 12) - 1) * 0.0001;
	const hue = this.rotation;
	const rgb = getRainbowRGB(hue);

	this.setAuraColor(rgb.r, rgb.g, rgb.b);
	if (colorTitlebar) {
		var parentWindow = getParentWindow();
		if (parentWindow && parentWindow.__LVMessenger && parentWindow.__LVMessenger.accent) {
			var color = rgbToHex(rgb.r, rgb.g, rgb.b);
			if (time - lastUpdateTime > THROTTLE_MS) {
				parentWindow.__LVMessenger.accent.setAttribute('content', color);
				lastUpdateTime = time;
			}
		}
	}

	var beatInfo = beatDetector.update(freqData, time);

	switch (this.visualizer) {
		case "intensity":
			this.drawIntensity(ctx, width, height, freqData, count, rgb, averageIntensity, time);
			break;
		case "beatpulse":
			this.drawBeatPulse(ctx, width, height, freqData, count, rgb, beatInfo, time);
			break;
		case "spiral":
			this.drawSpiral(ctx, width, height, freqData, count, rgb, time);
			break;
		case "waveform":
			this.drawWaveform(ctx, width, height, freqData, timeData, count, rgb, time);
			break;
		case "circle":
			this.drawCircle(ctx, width, height, freqData, timeData, count, rgb);
			break;
		default:
			this.drawBars(ctx, width, height, freqData, count, rgb);
			break;
	}

	this.prevTime = time;
};

MusicApp.prototype.loadVisualizerApps = function() {
	LVMessenger.broadcastToParent("visualizers", null, "music");
};

if (visualiserOption) visualiserOption.onchange = function() {
	if (visualiserOption instanceof HTMLSelectElement)
		window.musicApp.visualizer = visualiserOption.value || "bars";
};

function startAnimation(){
	fft.oninput = function(){
		audioVisualiser.updateBinCount(Math.pow(2, this.value));
	}
	window.requestAnimationFrame(window.musicApp.animateFrame.bind(window.musicApp));
}

file.onchange = function(){
	audio.src = URL.createObjectURL(this.files[0]);
	audio.load();
	if(audioVisualiser) audioVisualiser.destroy();
	audioVisualiser = new AudioVisualizer(frequencies);
	audioVisualiser.initializeWithMediaElement(audio);
	startAnimation(audioVisualiser);
	volume.value = audio.volume*100;
};

audio.oncanplay = function(){
	seek.max = audio.duration;
};

function playHandler() { audio.play(); }
function pauseHandler() { audio.pause(); }

play.onclick = playHandler;

audio.onplaying = function(){
	play.innerText = "\u23F8\uFE0E";
	play.onclick = pauseHandler;
	audioVisualiser.initializeWithMediaElement(audio);
}

audio.onpause = function(){
	play.innerText = "\u25B6\uFE0E";
	play.onclick = playHandler;
}

seek.oninput = function(ev){
	audio.currentTime = this.value;
}

volume.oninput = function(ev){
	audio.volume = (this.value>100?100:this.value<0?0:this.value)/100;
}

var timeoute;
function autoHideControls(){
	document.body.classList.remove("full");
	clearTimeout(timeoute);
	timeoute = setTimeout(options.classList.add.bind(document.body.classList, "full"), 3000);
}

if(new URL(window.location).searchParams && new URL(window.location).searchParams.get("fullscreen")) {
	autoHideControls();
	document.onmousemove = autoHideControls;
}

function refresh(){
	const m = parseInt(audio.currentTime/60);
	const s = parseInt(audio.currentTime%60);
	const ms = parseInt(audio.currentTime%1/0.01);
	const text = (m<10?"0"+m:m) +":" +( s<10?"0"+s:s) + "."+ (ms<10?"0"+ms:ms);
	seekOutput.innerText = text;
}

LVMessenger.receive(function(type, data, id) {
	if (type === "visualizers") {
		if (data && Array.isArray(data)) {
			console.log("visualizer apps:", data);
			elements = data;
		}
	}
});

}

// LVM
