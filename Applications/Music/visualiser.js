// Audio visualiser with vanilla JavaScript
// Lasse Lauwerys © 2024
// 10/1/2024

'use strict';

function AudioVisualiser(fftSize){
    this.preInit();
    this.elementSource;
    this.streamSource;
    this.updateBinCount(fftSize);
    this._frequencyData = new Uint8Array(),
    this._timeDomainData = new Uint8Array()
}

AudioVisualiser.prototype.dump = function () {
        this.analyser.disconnect();
    };

AudioVisualiser.prototype.disconnectAnalyser = function () {
        if (this.analyser && this.analyser.disconnect) this.analyser.disconnect();
    };

AudioVisualiser.prototype.preInit = function () {
    this.context = new AudioContext();
    this.analyser = this.context.createAnalyser();
};

AudioVisualiser.prototype.initialize = function (source) {
    this.source = source;
    this.source.connect(this.analyser);
    this.analyser.connect(this.context.destination);
}

AudioVisualiser.prototype.initializeWithMediaElement = function (element) {
    this.preInit();
    this.initialize(this.context.createMediaElementSource(element));
};

AudioVisualiser.prototype.initializeWithMediaStream = function (stream) {
    this.preInit();
    this.initialize(this.context.createMediaStreamSource(stream));
};

AudioVisualiser.prototype.updateBinCount = function (fftSize) {
        this.analyser.fftSize = fftSize || 64;
        this._frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
        this._timeDomainData = new Uint8Array(this.analyser.frequencyBinCount);
    },
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