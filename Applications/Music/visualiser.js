// Audio visualiser with vanilla JavaScript
// Lasse Lauwerys © 2024
// 10/1/2024

'use strict';

function AudioVisualiser(fftSize){
    this.elementSource = null;
    this.streamSource = null;
    this.source = null;
    
    /** @type {AudioContext} */
    this.context = AudioVisualiser._sharedContext;
    this.analyser = this.context.createAnalyser();

    this.updateBinCount(fftSize);
    this._frequencyData = new Uint8Array(),
    this._timeDomainData = new Uint8Array()
}

AudioVisualiser._sharedContext = new AudioContext();

AudioVisualiser.prototype.destroy = function () {
        this.analyser.disconnect();
    };

AudioVisualiser.prototype.disconnectAnalyser = function () {
    if (this.analyser && this.analyser.disconnect) this.analyser.disconnect();
};

AudioVisualiser.prototype.initialize = function (source) {
    if (this.source && this.source.disconnect) {
        try { this.source.disconnect(this.analyser); } catch (e) {}
    }
    this.analyser.disconnect();
    this.source = source;
    this.source.connect(this.analyser);
    this.analyser.connect(this.context.destination);
}

AudioVisualiser.prototype.initializeWithMediaElement = function (element) {
    if (!AudioVisualiser._elementSources) AudioVisualiser._elementSources = new WeakMap();
    this.elementSource = AudioVisualiser._elementSources.get(element);
    if (!this.elementSource) {
        this.elementSource = this.context.createMediaElementSource(element);
        AudioVisualiser._elementSources.set(element, this.elementSource);
    }
    this.initialize(this.elementSource);
};

AudioVisualiser.prototype.initializeWithMediaStream = function (stream) {
    this.streamSource = this.context.createMediaStreamSource(stream);
    this.initialize(this.streamSource);
};

AudioVisualiser.prototype.updateBinCount = function (fftSize) {
        this.analyser.fftSize = fftSize || 64;
        this._frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
        this._timeDomainData = new Uint8Array(this.analyser.frequencyBinCount);
    },

Object.defineProperty(AudioVisualiser, "sharedContext", {
  get: function() {
    if (!AudioVisualiser._sharedContext) AudioVisualiser._sharedContext = new AudioContext();
    this.context = AudioVisualiser._sharedContext;
    }
});

Object.defineProperty(AudioVisualiser.prototype, "frequencyBinCount", {
  get: function() {
        return this.analyser.frequencyBinCount;
    }
});

Object.defineProperty(AudioVisualiser.prototype, "frequencyData", {
    get: function() {
        return this.analyser.getByteFrequencyData(this._frequencyData), this._frequencyData;
    },
});

Object.defineProperty(AudioVisualiser.prototype, "timeDomainData", {
    get: function() {
        return this.analyser.getByteTimeDomainData(this._timeDomainData), this._timeDomainData;
    }
});
