// Scripts for the front end of the music application
// Lasse Lauwerys © 2023

'use strict';

{
var frequencies = 512;

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

// ── Aura Boom (drum/peak → white flash) ───────────────────────
let auraBoomEnabled = false;
let auraBoomSmoothed = 0;
let auraBoomSensitivity = 1.0; // 0.4 … 2.0 via slider
const AURA_BOOM_GATE = 0.14; // below this, stay fully colored
const AURA_BOOM_DECAY = 0.14; // faster decay so it doesn't linger white
const AURA_BOOM_ATTACK = 0.38;

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
	// ~1.4s window (86 * ~16.7ms) — longer & more stable avg than 43
	this.energyHistory = new Float32Array(86);
	this.historyIndex = 0;
	this.beatCooldown = 0;
	this.lastBeatTime = 0;
	this.bpmHistory = [];
	this.detectedBPM = 0;
	this.isBeat = false;
	this.beatIntensity = 0;
	this.smoothBPM = 0;
	this.bpmConfidence = 0; // 0..1 stable
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

	var threshold = avgEnergy + stdDev * 1.0 + 0.015;
	var beatDetected = totalEnergy > threshold && lowEnergy > avgEnergy * 1.05;
	var cooldownMs = 220;

	this.isBeat = false;
	if (beatDetected && this.beatCooldown <= 0) {
		this.isBeat = true;
		this.beatIntensity = 1.0;
		this.beatCooldown = cooldownMs;

		if (this.lastBeatTime > 0) {
			var interval = time - this.lastBeatTime;
			if (interval > 250 && interval < 2000) {
				var bpm = 60000 / interval;
				// ── Half/double-time correction using median so far
				if (this.bpmHistory.length >= 6) {
					var tmp = this.bpmHistory.slice().sort(function(a,b){return a-b;});
					var med = tmp[Math.floor(tmp.length/2)];
					if (med > 1) {
						if (bpm > med * 1.85 && bpm < med * 2.15) bpm /= 2;
						else if (bpm < med * 0.58 && bpm > med * 0.42) bpm *= 2;
					}
				}
				this.bpmHistory.push(bpm);
				if (this.bpmHistory.length > 64) this.bpmHistory.shift();

				// ── Accurate, slow-moving BPM: median + outlier-rejected mean
				// show provisional BPM after just 2 intervals, stabilize after 8+
				if (this.bpmHistory.length >= 2) {
					var sorted = this.bpmHistory.slice().sort(function(a,b){return a-b;});
					var median = sorted[Math.floor(sorted.length/2)];
					var filtered = [];
					// for tiny history (<4) don't filter — just use all
					if (this.bpmHistory.length < 4) {
						filtered = sorted;
					} else {
						for (var fi = 0; fi < this.bpmHistory.length; fi++) {
							var v = this.bpmHistory[fi];
							var tol = Math.max(5, median * 0.10);
							if (Math.abs(v - median) <= tol) filtered.push(v);
						}
					}
					var useList = filtered;
					if (this.bpmHistory.length >= 4) {
						useList = filtered.length >= Math.max(4, this.bpmHistory.length * 0.5) ? filtered : sorted;
					}
					var bSum = 0;
					for (var bi = 0; bi < useList.length; bi++) bSum += useList[bi];
					this.detectedBPM = bSum / useList.length;

					if (this.smoothBPM === 0) this.smoothBPM = this.detectedBPM;
					else {
						// provisional snaps fast (0.22), stable drifts slow (0.05)
						var lerp = this.bpmHistory.length < 4 ? 0.22 : (this.bpmHistory.length >= 12 ? 0.05 : 0.08);
						this.smoothBPM += (this.detectedBPM - this.smoothBPM) * lerp;
					}

					// ── Prefer half-tempo: user wants half the speed it generally detects
					// e.g. 124 → 62. Lerp strongly to half so it feels half-time by default.
					// Still allow manual 2× to go back — nudge scales history.
					if (this.smoothBPM > 80) {
						var half = this.smoothBPM / 2;
						// require at least 2 beats before halving provisional, then always bias to half
						if (this.bpmHistory.length >= 2) {
							var halfTarget = half;
							// if already has half support, snap faster; otherwise gentle bias
							var hasHalfSupport = false;
							if (this.bpmHistory.length >= 8) {
								var hh = 0;
								for (var hi = 0; hi < this.bpmHistory.length; hi++) {
									var hv = this.bpmHistory[hi];
									if (Math.abs(hv - half) <= Math.max(4, half * 0.08)) hh++;
									if (Math.abs(hv * 2 - this.smoothBPM) <= Math.max(4, this.smoothBPM * 0.08)) hh++;
								}
								hasHalfSupport = hh >= 4;
							}
							var lerpHalf = hasHalfSupport ? 0.22 : 0.14;
							this.smoothBPM += (halfTarget - this.smoothBPM) * lerpHalf;
							this.detectedBPM = halfTarget;
						}
					}

					// confidence: low variance + enough samples
					var vSum = 0;
					for (var vi = 0; vi < useList.length; vi++) { var d = useList[vi] - this.detectedBPM; vSum += d*d; }
					var bpmStd = Math.sqrt(vSum / useList.length);
					var stable = bpmStd < Math.max(2.5, this.detectedBPM * 0.025);
					// ramp confidence 0..1 over time
					var targetConf = (stable && useList.length >= 8) ? 1 : (useList.length >= 4 ? 0.5 : 0);
					this.bpmConfidence += (targetConf - this.bpmConfidence) * 0.08;
					if (this.bpmConfidence < 0) this.bpmConfidence = 0;
					if (this.bpmConfidence > 1) this.bpmConfidence = 1;
				}
			}
		}
		this.lastBeatTime = time;
	}

	if (this.beatCooldown > 0) this.beatCooldown -= 16.67;
	this.beatIntensity *= 0.92;
	if (this.beatIntensity < 0.001) this.beatIntensity = 0;

	return { isBeat: this.isBeat, beatIntensity: this.beatIntensity, bpm: this.smoothBPM, lastBeatTime: this.lastBeatTime, bpmConfidence: this.bpmConfidence, bpmHistoryLen: this.bpmHistory.length, detectedBPM: this.detectedBPM, _dbg: { threshold: threshold, avgEnergy: avgEnergy, lowEnergy: lowEnergy, totalEnergy: totalEnergy, stdDev: stdDev } };
};

var beatDetector = new BeatDetector();


// ── MusicApp ────────────────────────────────────────────────────

/** @param {HTMLCanvasElement} visualizerElement */
function MusicApp(visualizerElement) {
	this.graphics = new Graphics2D(visualizerElement);
	console.log("graphics canvas found:", this.graphics.ctx);

	/** @type {"bars" | "circle" | "cake" | "intensity" | "beatpulse" | "spiral" | "waveform" | "bpmdebug"} */
	this.visualizer = "bars";

	this.prevTime = 0;
	this.rotation = 0;

	// ── BPM debug histories ──────────────────────────────────
	this.dbgMax = 360; // ~6s at 60fps
	this.dbgInt = []; this.dbgLow = []; this.dbgAvg = []; this.dbgThr = [];
	this.dbgBeat = []; // 1 if beat else 0
	this.dbgBpm = []; this.dbgAura = [];

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
 * If Boom mode is on, the requested colour is faded toward white by the
 * current drum/intensity amount (auraBoomSmoothed 0..1) so booms feel white.
 * @param {number} r 0-255
 * @param {number} g 0-255
 * @param {number} b 0-255
 */
MusicApp.prototype.setAuraColor = function (r, g, b) {
	if (!aura || !aura.device) return;
	if (auraBoomEnabled && auraBoomSmoothed > 0.001) {
		// map smoothed 0..1 through a curve so mid values stay tinted and only
		// real peaks go near-white — fixes "always white / too sensitive"
		var flashAmt = Math.pow(auraBoomSmoothed, 1.8) * 0.96;
		if (flashAmt > 1) flashAmt = 1;
		var flashed = flashWhite({ r: r, g: g, b: b }, flashAmt);
		r = flashed.r; g = flashed.g; b = flashed.b;
	}
	aura.setColor(r, g, b).catch(function () {});
};

/** Update the Boom toggle button label/state */
function updateAuraBoomButton() {
	var btn = document.getElementById("aura-boom-button");
	if (!btn) return;
	btn.textContent = auraBoomEnabled ? "Aura Boom: ON" : "Aura Boom: OFF";
	btn.setAttribute("aria-pressed", auraBoomEnabled ? "true" : "false");
	btn.classList.toggle("active", auraBoomEnabled);
	btn.title = auraBoomEnabled
		? "Boom mode ON — keyboard fades to white on drums/peaks"
		: "Boom mode OFF — keyboard stays on rainbow";
	var sens = document.getElementById("aura-boom-sensitivity");
	var sensLabel = document.getElementById("aura-boom-sens-label");
	if (sens) sens.style.display = auraBoomEnabled ? "" : "none";
	if (sensLabel) sensLabel.style.display = auraBoomEnabled ? "" : "none";
}

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

var auraBoomButton = document.getElementById("aura-boom-button");
var auraBoomSensSlider = document.getElementById("aura-boom-sensitivity");
if (auraBoomSensSlider) {
	auraBoomSensSlider.oninput = function(){
		auraBoomSensitivity = parseFloat(this.value) || 1.0;
		var lbl = document.getElementById("aura-boom-sens-val");
		if (lbl) lbl.textContent = (Math.round(auraBoomSensitivity * 10) / 10).toFixed(1) + "x";
	};
	// init from DOM
	auraBoomSensitivity = parseFloat(auraBoomSensSlider.value) || 1.0;
}
if (auraBoomButton) {
	updateAuraBoomButton();
	auraBoomButton.onclick = function(ev){
		ev.preventDefault();
		auraBoomEnabled = !auraBoomEnabled;
		if (auraBoomEnabled && aura && !aura.device) {
			aura.init(true).catch(function(){});
		}
		if (!auraBoomEnabled) auraBoomSmoothed = 0;
		updateAuraBoomButton();
		console.log("Aura Boom:", auraBoomEnabled ? "ON" : "OFF", "sens", auraBoomSensitivity);
	};
}

// ── BPM pulse dot + manual half/double ─────────────────────────
(function initBpmControls(){
	var halfBtn = document.getElementById("bpm-half");
	var dblBtn  = document.getElementById("bpm-double");
	function nudge(factor){
		if (!beatDetector.bpmHistory.length) return;
		// scale history and smooth so next beats use corrected tempo immediately
		for (var i=0;i<beatDetector.bpmHistory.length;i++) beatDetector.bpmHistory[i] *= factor;
		beatDetector.detectedBPM *= factor;
		beatDetector.smoothBPM *= factor;
		if (beatDetector.smoothBPM < 40) beatDetector.smoothBPM = 40;
		if (beatDetector.smoothBPM > 220) beatDetector.smoothBPM = 220;
		console.log("BPM nudged", factor>1?"2x":"½", "→", Math.round(beatDetector.smoothBPM));
	}
	if (halfBtn) halfBtn.onclick = function(ev){ ev.preventDefault(); nudge(0.5); };
	if (dblBtn) dblBtn.onclick = function(ev){ ev.preventDefault(); nudge(2); };
})();

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


// ── Visualizer: BPM debug (intensity + threshold + BPM graph) ─
MusicApp.prototype.drawBpmDebug = function(ctx, width, height, freqData, count, rgb, averageIntensity, beatInfo, time) {
	// layout: top 52% = intensity/bass/threshold, mid 28% = BPM history, bottom = stats
	var pad = 10;
	var topH = Math.floor(height * 0.52);
	var midH = Math.floor(height * 0.28);
	var botY = topH + midH;

	ctx.fillStyle = "#0a0a0a";
	ctx.fillRect(0,0,width,height);

	// ── helpers
	function plotLine(arr, y0, h, color, maxV, fillAlpha){
		if (!arr.length) return;
		ctx.beginPath();
		for (var i=0;i<arr.length;i++){
			var x = (i / (this.dbgMax-1)) * (width - pad*2) + pad;
			var v = Math.max(0, Math.min(1, arr[i]/maxV));
			var y = y0 + h - v*h - 4;
			if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
		}
		ctx.strokeStyle = color;
		ctx.lineWidth = 1.5;
		ctx.stroke();
		if (fillAlpha){
			ctx.lineTo(pad + (arr.length-1)/(this.dbgMax-1)*(width-pad*2), y0+h);
			ctx.lineTo(pad, y0+h);
			ctx.closePath();
			ctx.fillStyle = color.replace("1)", fillAlpha+")").replace(")", ","+fillAlpha+")");
			// crude: use globalAlpha
			ctx.globalAlpha = 0.12;
			ctx.fill();
			ctx.globalAlpha = 1;
		}
	}
	var self=this;
	// grid for top
	ctx.strokeStyle = "rgba(255,255,255,0.06)";
	ctx.lineWidth = 1;
	for (var gy=0; gy<=4; gy++){
		var gyPos = gy/4*topH;
		ctx.beginPath(); ctx.moveTo(pad, gyPos); ctx.lineTo(width-pad, gyPos); ctx.stroke();
	}

	// plot avg intensity (0-255), low bass (0-255), avgEnergy*255, threshold*255
	// need to map energy 0..1 to 0..255 for display
	var avgArr = this.dbgAvg.map(function(v){ return v*255; });
	var thrArr = this.dbgThr.map(function(v){ return v*255; });
	plotLine.call(this, this.dbgInt, 0, topH, "rgba(255,255,255,1)", 255, null);
	plotLine.call(this, this.dbgLow, 0, topH, "rgba(255,120,40,1)", 255, null);
	plotLine.call(this, avgArr, 0, topH, "rgba(80,180,255,0.9)", 255, null);
	plotLine.call(this, thrArr, 0, topH, "rgba(255,40,120,0.95)", 255, null);

	// beat markers (vertical)
	for (var i=0;i<this.dbgBeat.length;i++) if (this.dbgBeat[i]){
		var x = (i/(this.dbgMax-1))*(width-pad*2)+pad;
		ctx.fillStyle = this.dbgBeat[i]===2 ? "rgba(255,255,120,0.9)" : "rgba(255,60,60,0.9)"; // 2 = BPM pulse
		ctx.fillRect(x, 0, 1.5, topH);
	}
	// aura white level
	plotLine.call(this, this.dbgAura.map(function(v){return v*255;}), 0, topH, "rgba(255,255,255,0.45)", 255, null);

	// legend top
	ctx.fillStyle = "rgba(255,255,255,0.9)";
	ctx.font = "11px monospace";
	ctx.textAlign = "left";
	ctx.fillText("INT white  BASS orange  avg blue  thr pink  aura dimWhite  |  beat red  BPM-pulse yellow", pad, 12);
	ctx.fillStyle = "rgba(255,255,255,0.55)";
	ctx.font = "10px monospace";
	ctx.fillText("top: 0→255 intensity  (threshold = avg + std*1.0 +0.015, low>avg*1.05)", pad, 24);

	// ── mid: BPM history 30-200 BPM
	var bpmY0 = topH, bpmH = midH;
	ctx.fillStyle = "rgba(0,0,0,0.25)";
	ctx.fillRect(0,bpmY0,width,bpmH);
	// grid BPM
	ctx.strokeStyle = "rgba(255,255,255,0.07)";
	for (var bpmV=60; bpmV<=180; bpmV+=30){
		var by = bpmY0 + bpmH - ((bpmV-30)/170)*bpmH;
		ctx.beginPath(); ctx.moveTo(pad, by); ctx.lineTo(width-pad, by); ctx.stroke();
		ctx.fillStyle="rgba(255,255,255,0.35)";
		ctx.font="10px monospace"; ctx.textAlign="left";
		ctx.fillText(bpmV+"", pad, by-2);
	}
	// plot BPM
	if (this.dbgBpm.length){
		ctx.beginPath();
		for (var i=0;i<this.dbgBpm.length;i++){
			var x = (i/(this.dbgMax-1))*(width-pad*2)+pad;
			var bpmP = this.dbgBpm[i];
			if (!bpmP) continue;
			var y = bpmY0 + bpmH - ((bpmP-30)/170)*bpmH;
			y = Math.max(bpmY0+2, Math.min(bpmY0+bpmH-2, y));
			if (i===0 || !this.dbgBpm[i-1]) ctx.moveTo(x,y); else ctx.lineTo(x,y);
		}
		ctx.strokeStyle = "rgba(120,255,120,1)";
		ctx.lineWidth = 1.8;
		ctx.stroke();
		// dots for current BPMs in history (raw)
		ctx.fillStyle = "rgba(120,255,120,0.35)";
		for (var i=0;i<beatDetector.bpmHistory.length;i++){
			var bv = beatDetector.bpmHistory[i];
			var y = bpmY0 + bpmH - ((bv-30)/170)*bpmH;
			var x = width - pad - 60 + (i/64)*50;
			ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI*2); ctx.fill();
		}
	}
	ctx.fillStyle="rgba(120,255,120,0.9)";
	ctx.font="11px monospace"; ctx.textAlign="left";
	ctx.fillText("BPM history (30–200) — green line = smoothBPM, dots = raw intervals", pad, bpmY0+12);

	// ── bottom stats
	var yb = botY + 14;
	ctx.fillStyle = "#111";
	ctx.fillRect(0, botY, width, height-botY);
	ctx.fillStyle = "rgba(255,255,255,0.92)";
	ctx.font = "12px monospace";
	ctx.textAlign = "left";
	var bpmD = beatInfo.bpm, conf = beatInfo.bpmConfidence, hl = beatInfo.bpmHistoryLen;
	var lastI = beatInfo.lastBeatTime ? (time-beatInfo.lastBeatTime|0) : 0;
	var intStr = averageIntensity|0;
	var lowV = (this.dbgLow.length? this.dbgLow[this.dbgLow.length-1]|0 : 0);
	var thrV = (this.dbgThr.length? (this.dbgThr[this.dbgThr.length-1]*255|0) : 0);
	var avgV = (this.dbgAvg.length? (this.dbgAvg[this.dbgAvg.length-1]*255|0) : 0);
	ctx.fillText("BPM: " + (bpmD? Math.round(bpmD) + (conf<0.55?" ~":"") : "--") + "  conf " + Math.round(conf*100) + "%  hist " + hl + "  half-biased (>80→/2)  lastBeat " + lastI + "ms ago", pad, yb);
	ctx.fillStyle = "rgba(255,255,255,0.65)";
	ctx.font = "11px monospace";
	ctx.fillText("INT " + intStr + "  BASS " + lowV + "  avg " + avgV + "  thr " + thrV + "  aura " + (auraBoomSmoothed*100|0) + "%  sens " + auraBoomSensitivity.toFixed(1) + "x  cooldown " + (beatDetector.beatCooldown|0) + "ms", pad, yb+14);
	ctx.fillStyle = "rgba(255,200,100,0.85)";
	ctx.fillText("fast bass tip: if thr rides high or beats cluster, BPM reads double — dot flashes twice/kick → hit ½. Graph shows why.", pad, yb+28);

	// border
	ctx.strokeStyle = "rgba(255,255,255,0.08)";
	ctx.strokeRect(0,0,width,height);
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

	const count = audioVisualiser.frequencyBinCount;

	var total = 0;
	for (let i = 0; i < freqData.length; i++)
		total += freqData[i];
	const averageIntensity = total / count;

	this.rotation += (Math.pow(2, averageIntensity / 255 * 12) - 1) * 0.0001;
	const hue = this.rotation;
	const rgb = getRainbowRGB(hue);

	// Keep this running even for "cake" so Module.onAuraColor (wasm) flashes.
	var beatForAura = beatDetector.update(freqData, time);

	// ── BPM pulse dot — flashes white on the beat grid so you can see if BPM is right
	// (independent of Aura Boom, lets you verify double-time vs half-time)
	(function updateBpmDot(){
		var dot = document.getElementById("bpm-pulse-dot");
		var lbl = document.getElementById("bpm-pulse-label");
		if (lbl) {
			var bpmDisp = beatForAura.bpm;
			lbl.textContent = bpmDisp > 0 ? Math.round(bpmDisp) + " BPM" + (beatForAura.bpmConfidence < 0.55 ? " ~" : "") : "-- BPM";
			lbl.title = beatForAura.bpmHistoryLen + " beats, conf " + Math.round(beatForAura.bpmConfidence*100) + "% — dot flashes on BPM, hit ½ if it flashes twice per kick";
		}
		if (!dot) return;
		var bpm = beatForAura.bpm;
		if (bpm > 30 && beatForAura.lastBeatTime > 0) {
			var interval = 60000 / bpm;
			var since = time - beatForAura.lastBeatTime;
			var phase = ((since % interval) + interval) % interval;
			var w = Math.min(160, interval * 0.26);
			var p = Math.max(0, 1 - phase / w);
			p = Math.pow(p, 1.6);
			if (beatForAura.bpmConfidence < 0.32 || beatForAura.bpmHistoryLen < 6) p = Math.max(p, beatForAura.beatIntensity * 0.62);
			dot.style.background = p > 0.06 ? "rgb(255,255,255)" : (beatForAura.bpmConfidence > 0.5 ? "#bbb" : "#444");
			dot.style.boxShadow = p > 0.06 ? "0 0 " + (6 + p*14) + "px rgba(255,255,255," + (0.5 + p*0.5) + ")" : "0 0 0 0 rgba(0,0,0,0)";
			dot.style.transform = "scale(" + (1 + p*0.55) + ")";
			dot.style.opacity = p > 0.06 ? "1" : "0.95";
		} else if (beatForAura.isBeat) {
			dot.style.background = "#fff";
			dot.style.transform = "scale(1.5)";
			dot.style.boxShadow = "0 0 10px rgba(255,255,255,0.9)";
		} else {
			dot.style.background = "#444";
			dot.style.transform = "scale(1)";
			dot.style.boxShadow = "0 0 0 0 rgba(0,0,0,0)";
		}
	})();

	// ── debug histories (for bpmdebug visualizer) ──────────────
	(function pushDbg(){
		var lowBinsDbg = Math.max(1, Math.min(12, Math.floor(freqData.length * 0.08)));
		var lowSumDbg=0; for (var bi=0; bi<lowBinsDbg; bi++) lowSumDbg+=freqData[bi];
		var lowDbg = (lowSumDbg/lowBinsDbg);
		var thrDbg = beatForAura._dbg ? beatForAura._dbg.threshold : 0;
		var avgDbg = beatForAura._dbg ? beatForAura._dbg.avgEnergy : 0;
		// BPM pulse marker (yellow) vs raw beat (red)
		var isBpmPulse = false;
		if (beatForAura.bpm > 40 && beatForAura.lastBeatTime>0){
			var _iv = 60000/beatForAura.bpm;
			var _ph = ((time - beatForAura.lastBeatTime) % _iv + _iv) % _iv;
			isBpmPulse = _ph < Math.min(150, _iv*0.26) * 0.35;
		}
		var _self = window.musicApp;
		if (!_self) return;
		_self.dbgInt.push(averageIntensity);
		_self.dbgLow.push(lowDbg);
		_self.dbgAvg.push(avgDbg);
		_self.dbgThr.push(thrDbg);
		_self.dbgBeat.push(beatForAura.isBeat ? 1 : (isBpmPulse ? 2 : 0));
		_self.dbgBpm.push(beatForAura.bpm || 0);
		_self.dbgAura.push(auraBoomSmoothed*255);
		var cap = _self.dbgMax;
		if (_self.dbgInt.length > cap){ _self.dbgInt.shift(); _self.dbgLow.shift(); _self.dbgAvg.shift(); _self.dbgThr.shift(); _self.dbgBeat.shift(); _self.dbgBpm.shift(); _self.dbgAura.shift(); }
	})();

	// ── Aura Boom: BASS-driven BPM-synced white pulses ─────────
	// Bass causes the flash, BPM keeps it locked to the beat grid.
	var auraTarget = 0;
	if (auraBoomEnabled) {
		var bpm = beatForAura.bpm;
		var normIntensity = averageIntensity / 255;
		// use true bass band — ~8% lowest bins = kick/bass, not mids
		var lowBins = Math.max(1, Math.min(12, Math.floor(freqData.length * 0.08)));
		var lowSum = 0;
		for (var bi = 0; bi < lowBins; bi++) lowSum += freqData[bi];
		var lowAvg = (lowSum / lowBins) / 255;
		// bassLevel is the driver: needs loud bass to go white, quiet bass stays colored
		var bassLevel = Math.pow(lowAvg, 1.15);
		// loudScale just tints the flash a bit, bass dominates
		var loudScale = Math.pow(Math.max(0, normIntensity - 0.12) / 0.88, 0.9);

		// flash constantly even before lock — use provisional BPM if we have any
		var useBpmPulse = bpm > 40 && bpm < 220
			&& beatForAura.bpmHistoryLen >= 2
			&& beatForAura.lastBeatTime > 0;

		if (useBpmPulse) {
			// BPM (even provisional, not too far off) — grid pulse, constant intensity, never miss
			var interval = 60000 / bpm;
			var since = time - beatForAura.lastBeatTime;
			var phaseMs = ((since % interval) + interval) % interval;
			var pulseW = Math.min(150, interval * 0.26);
			var pulse = Math.max(0, 1 - phaseMs / pulseW);
			pulse = Math.pow(pulse, 1.45);
			var amp = pulse * 0.92;
			auraTarget = amp * auraBoomSensitivity;
		} else {
			// no BPM yet — flash on every detected beat, also constant (don't miss)
			var beatWhite = beatForAura.beatIntensity * 0.90;
			if (beatWhite < 0.08) beatWhite = 0;
			else beatWhite = Math.pow((beatWhite - 0.08) / 0.92, 1.10);
			auraTarget = beatWhite * auraBoomSensitivity;
		}
		// extra gate so hi-hats/mids don't wash white
		if (auraTarget < AURA_BOOM_GATE) auraTarget = 0;
		else {
			auraTarget = (auraTarget - AURA_BOOM_GATE) / (1 - AURA_BOOM_GATE);
			auraTarget = Math.pow(auraTarget, 1.12);
		}
		if (auraTarget > 1) auraTarget = 1;
		if (auraTarget < 0) auraTarget = 0;
	}
	// snap white on kick, slower fade back to colour (lingers white longer)
	var attack = 0.58, decay = 0.09;
	if (auraTarget > auraBoomSmoothed) {
		auraBoomSmoothed += (auraTarget - auraBoomSmoothed) * attack;
	} else {
		auraBoomSmoothed += (auraTarget - auraBoomSmoothed) * decay;
	}
	if (auraBoomSmoothed < 0.001) auraBoomSmoothed = 0;
	if (auraBoomSmoothed > 1) auraBoomSmoothed = 1;

	// For 2D visualizers we push the colour ourselves; setAuraColor will
	// internally flash toward white when Boom is on (using auraBoomSmoothed).
	// For Cake, the wasm calls Module.onAuraColor -> setAuraColor which flashes there.
	if (this.visualizer !== "cake") {
		this.setAuraColor(rgb.r, rgb.g, rgb.b);
	}

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

	var beatInfo = beatForAura;

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
		case "bpmdebug":
			this.drawBpmDebug(ctx, width, height, freqData, count, rgb, averageIntensity, beatInfo, time);
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
