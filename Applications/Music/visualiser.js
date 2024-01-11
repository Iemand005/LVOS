// Audio visualiser with vanilla JavaScript
// Lasse Lauwerys © 2024
// 10/1/2024

function AudioVisualiser(fftSize){
    this.context = new AudioContext;
    this.analyser = this.context.createAnalyser();
    this.source;
    this.updateBinCount(fftSize);
}

AudioVisualiser.prototype = {
    _frequencyData: new Uint8Array(),
    _timeDomainData: new Uint8Array(),
    initializeWithMediaElement: function(element){
        this.source = this.context.createMediaElementSource(element);
        this.source.connect(this.analyser);
        this.analyser.connect(this.context.destination);
    },

    initializeWithMediaStream: function(stream){
        this.source = this.context.createMediaStreamSource(stream);
        this.source.connect(this.analyser);
        this.analyser.connect(this.context.destination);
    },
    updateBinCount: function(fftSize){
        this.analyser.fftSize = fftSize || 64;
        this._frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
        this._timeDomainData = new Uint8Array(this.analyser.frequencyBinCount);
    },
    get frequencyBinCount(){
        return this.analyser.frequencyBinCount;
    },
    get frequencyData(){
        return this.analyser.getByteFrequencyData(this._frequencyData), this._frequencyData;
    },
    get timeDomainData(){
        return this.analyser.getByteTimeDomainData(this._timeDomainData), this._timeDomainData;
    }
}