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
    _data: new Uint8Array(),
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
        this._data = new Uint8Array(this.analyser.frequencyBinCount)
    },
    set frequencyBinCount(fftSize){
        this.analyser.fftSize = fftSize || 64;
        this._data = new Uint8Array(this.analyser.frequencyBinCount)
    },
    get frequencyBinCount(){
        return this.analyser.frequencyBinCount;
    },
    get frequencyData(){
        return this.analyser.getByteFrequencyData(this._data), this._data;
    },
    get timeDomainData(){
        return this.analyser.getByteTimeDomainData(this._data), this._data;
    }
}