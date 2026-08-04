// Scripts for the front end of the music application
// Lasse Lauwerys © 2023

'use strict';
'use esnext';
'use moz';

let musicApp = null;


{
var frequencies = 128;

var micButton = document.getElementById("mic");
var dispAudioBtn = document.getElementById("display-audio");
var auraButton = document.getElementById("aura-button");
var virtualAudio = document.createElement("audio");
var file = document.getElementById("file");
var audio = document.getElementsByTagName("audio")[0];
var visualiser = document.getElementById("visualizer");
// var ctx = visualiser instanceof HTMLCanvasElement ? visualiser.getContext("2d") : null;
var fullscreen = document.getElementById("fullscreen");
var volume = document.getElementById("volume");
var seek = document.getElementById("seek");
var play = document.getElementById("play");
var options = document.getElementById("options");
var seekOutput = document.getElementById("seek-output");
var volumeOutput = document.getElementById("volume-output");
var fft = document.getElementById("fft");
var visualiserOption = document.getElementById("style");
let elements = [];
var audioVisualiser = new AudioVisualizer(frequencies);
var circular = true;
var clear = true;

const media = new Media;
const aura = typeof Aura !== "undefined" ? new Aura : null;

const THROTTLE_MS = 20;

const colorTitlebar = false;


/** @param {HTMLCanvasElement} visualizerElement  */
function MusicApp(visualizerElement) {
    // return;
	this.graphics = new Graphics2D(visualizerElement);
	// this.ctx = visualizerElement.getContext("2d");
	console.log("graphics canvas found:", this.graphics.ctx);

	/** @type {"bars" | "circle" | "cake"} */
	this.visualizer = "bars";

	this.prevTime = 0;

	this.rotation = 0;
}

if (visualiser typeof HTMLCanvasElement)
musicApp = new MusicApp(visualiser);


// window.onresize = function() {
// 	musicApp.graphics.resize();
// }

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
    aura && aura.init().then(function() {
        console.log("Aura loaded!");
    });
};

// ctx.globalAlpha = 0.1;

function localFullscreen() {
    // document.body.requestFullscreen({navigationUI: ""});
    if (document.body.requestFullscreen) document.body.requestFullscreen();
    else if (document.body.msRequestFullscreen) document.body.msRequestFullscreen();
}

fullscreen.onclick = function(){
    localFullscreen();
    LVMessenger.broadcastToParent(LVMessenger.types.launchOverlay, "", "music");
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

let pipWindow = null;

function openCanvasPip() {
  if (!('documentPictureInPicture' in window)) {
    console.warn('Document Picture-in-Picture not supported.');
    return;
  }

  if (window.documentPictureInPicture.window) {
    window.documentPictureInPicture.window.close();
    return;
  }

	window.documentPictureInPicture.requestWindow({
		width: visualiser.width,
		height: visualiser.height,
	}).then(function(/** @type {Window} */pipWindow) {

		pipWindow.document.body.style.margin = '0';
		pipWindow.document.body.style.overflow = 'hidden';

		pipWindow.document.body.appendChild(visualiser);

		pipWindow.addEventListener('pagehide', function() {
			document.getElementById('visualiser-container').appendChild(visualiser);
			pipWindow = null;
		}, { once: true });
	}).catch(function(ex) {
		LVMessenger.broadcastToParent("pip", {id: "visualizer"}, "music");
	});
}

const pipBtn = document.getElementById("pip-button");
pipBtn.onclick = openCanvasPip;

function componentToHex(c) {
  var hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
  return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

let lastUpdateTime = 0;

/**
 * Extension: hand the browser analyser's bins over to the Emscripten module so
 * the wasm renderer (Cake) draws from the exact same data as the 2D bars/circle.
 * The AudioVisualizer class produces Uint8 bytes; convert them to the floats the
 * wasm expects (magnitudes 0..1, time-domain -1..1).
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

/** @param {number} time */
MusicApp.prototype.animateFrame = function(time) {

	const deltaTime = time - this.prevTime;

	this.rotation += deltaTime * 0.00001;

    // requestAnimationFrame(animateFrame.bind(this, audioVisualiser));
    window.requestAnimationFrame(this.animateFrame.bind(musicApp));
    if (!this.graphics.ctx) return;

    // Extension: feed the wasm renderer, and hand the canvas to Cake while the
    // "cake" style is selected (music.js only draws bars/circle).
    const freqData = audioVisualiser.frequencyData;
    const timeData = audioVisualiser.timeDomainData;
    this.pushBinsToWasm(freqData, timeData);
    if (this.visualizer === "cake") { this.prevTime = time; return; }

    const ctx = this.graphics.ctx;
    if(clear) this.graphics.ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    else {
        ctx.fillStyle = "#FF000099"
        ctx.beginPath();
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.fill();
        ctx.closePath();
    }
    refresh();
    //seekOutput.innerText = parseInt(audio.currentTime/60) +":" + parseInt(audio.currentTime%60) + "."+ parseInt(audio.currentTime%1/0.01);
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    seek.value = audio.currentTime;

    // const count = visualiserOption.frequ;
    const count = audioVisualiser.frequencyBinCount;

    var total = 0;
    for (let i = 0; i < freqData.length; i++)
        total += freqData[i];

    const averageIntensity = total / count;

    this.rotation += (Math.pow(2, averageIntensity / 255 * 12) - 1) * 0.0001;

    const hue = this.rotation;


    const rgb = getRainbowRGB(hue);

    if (aura && aura.device) aura.setColor(rgb.r, rgb.g, rgb.b);
	if (colorTitlebar) {
		var parentWindow = getParentWindow();
		if (parentWindow && parentWindow.__LVMessenger.accent) {
			var color = rgbToHex(rgb.r, rgb.g, rgb.b);
			
			if (time - lastUpdateTime > THROTTLE_MS) {
			parentWindow.__LVMessenger.accent.setAttribute('content', color);
				lastUpdateTime = time
			}
		}
	}
    
    /*let*/var cX = width/2;
    /*let*/var cY = height/2;
    const a = 70;
    ctx.fillStyle = "transparent";
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.fill();

    const fillStyle = "rgb(" + rgb.r + "," + rgb.g + "," + rgb.b + ")";

    if (this.visualizer === "circle") {
        /*let*/var rad = 0, inc = Math.PI*2*(1/count);
        ctx.lineWidth = 100;
        for(let index in timeData){
            const amp = parseInt(timeData[index]);

            const a = parseInt(freqData[index]);

            const x = (amp) * Math.cos(rad) + cX;
            const y = (amp) * Math.sin(rad) + cY;
            ctx.beginPath();

            ctx.fillStyle = fillStyle;

            ctx.arc(x, y, 10, 0, Math.PI*2);
            ctx.fill();
            // ctx.closePath();

            rad += inc;
        }
    } else for(let index in freqData){
        // count = freqData.length;    
        ctx.beginPath();

        const amp = parseInt(freqData[index]);
        const x = parseInt(index) * (width/count);
        ctx.fillStyle = fillStyle;
        ctx.fillRect(x, ctx.canvas.height, ctx.canvas.width/count, -(ctx.canvas.height/256 *amp));
        ctx.fill();
    // ctx.closePath();
    }

    this.prevTime = time;
    
};

MusicApp.prototype.loadVisualizerApps = function() {
    LVMessenger.broadcastToParent("visualizers", null, "music");
}

if (visualiserOption) visualiserOption.onchange = function() {
	if (visualiserOption instanceof HTMLSelectElement) musicApp.visualizer = visualiserOption.value || "bars";
}

function startAnimation(){
    fft.oninput = function(){
        audioVisualiser.updateBinCount(Math.pow(2, this.value)); // "2 ** this.value" works in more modern browsers too.
    }
    window.requestAnimationFrame(musicApp.animateFrame.bind(musicApp));
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

options.onsubmit = function(ev){
    ev.preventDefault();
};

// const playHandler = 
function playHandler() { audio.play(); }
function pauseHandler() { audio.pause(); }

play.onclick = playHandler;

audio.onplaying = function(){
    play.innerText = "⏸︎";
	play.onclick = pauseHandler;
    audioVisualiser.initializeWithMediaElement(audio);
}

audio.onpause = function(){
    play.innerText = "⏵︎";
    play.onclick = playHandler;
}

seek.oninput = function(ev){
    audio.currentTime = this.value;
}

volume.oninput = function(ev){
    audio.volume = (this.value>100?100:this.value<0?0:this.value)/100;
}

/*let*/var timeoute;
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