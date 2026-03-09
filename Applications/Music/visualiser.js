// Audio visualiser with vanilla JavaScript
// Lasse Lauwerys © 2024
// 10/1/2024

'use strict';

function AudioVisualiser(fftSize){
    this.context = new AudioContext(); // The brackets in a constructor without parameters aren't required anymore. I write them here for compatibility.
    this.analyser = this.context.createAnalyser();
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

AudioVisualiser.prototype.initializeWithMediaElement = function (element) {
        this.source = this.context.createMediaElementSource(element);
        this.source.connect(this.analyser);
        this.analyser.connect(this.context.destination);
    };

AudioVisualiser.prototype.initializeWithMediaStream = function (stream) {
        this.source = this.context.createMediaStreamSource(stream);
        this.source.connect(this.analyser);
        this.analyser.connect(this.context.destination);
    };

AudioVisualiser.prototype.updateBinCount = function (fftSize) {
        this.analyser.fftSize = fftSize || 64;
        this._frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
        this._timeDomainData = new Uint8Array(this.analyser.frequencyBinCount);
    },
    Object.defineProperty(Geode.prototype, "frequencyBinCount", {
  get: function() {
        return this.analyser.frequencyBinCount;
    }
});
    Object.defineProperty(Geode.prototype, "frequencyData", {
    get: function() {
        return this.analyser.getByteFrequencyData(this._frequencyData), this._frequencyData;
    },
});
    Object.defineProperty(Geode.prototype, "timeDomainData", {
    get: function() {
        return this.analyser.getByteTimeDomainData(this._timeDomainData), this._timeDomainData;
    }
});