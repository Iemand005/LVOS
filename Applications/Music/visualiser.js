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
}

AudioVisualiser.prototype = {
    _frequencyData: new Uint8Array(),
    _timeDomainData: new Uint8Array(),

    dump: function () {
        this.analyser.disconnect();
    },

    disconnectAnalyser: function () {
        if (this.analyser && this.analyser.disconnect) this.analyser.disconnect();
    },

    initializeWithMediaElement: function (element) {
        this.source = this.context.createMediaElementSource(element);
        this.source.connect(this.analyser);
        this.analyser.connect(this.context.destination);
    },

    initializeWithMediaStream: function (stream) {
        this.source = this.context.createMediaStreamSource(stream);
        this.source.connect(this.analyser);
        this.analyser.connect(this.context.destination);
    },

    updateBinCount: function (fftSize) {
        this.analyser.fftSize = fftSize || 64;
        this._frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
        this._timeDomainData = new Uint8Array(this.analyser.frequencyBinCount);
    },
    get frequencyBinCount() {
        return this.analyser.frequencyBinCount;
    },
    get frequencyData() {
        return this.analyser.getByteFrequencyData(this._frequencyData), this._frequencyData;
    },
    get timeDomainData() {
        return this.analyser.getByteTimeDomainData(this._timeDomainData), this._timeDomainData;
    }
};