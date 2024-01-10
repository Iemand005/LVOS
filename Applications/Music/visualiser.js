
// document.appendChild(document.getElementById("file"))

function AudioVisualiser(){
    this.context = new AudioContext;
    this.analyser = this.context.createAnalyser();
    // this.analyser.connect(.destination);
    this.source;
    this.data;
}

AudioVisualiser.prototype = {
    initializeWithMediaElement: function(element){
        this.source = this.context.createMediaElementSource(element);
    },

    initializeWithMediaStream: function(stream){
        this.source = this.context.createMediaStreamSource(stream);
    },
    start: function(fttSize){
        this.source.connect(this.analyser);
        this.analyser.fftSize = fttSize || 64;
        this.data = new Uint8Array(this.analyser.frequencyBinCount);
    },
    get analyserData(){
        return this.analyser.getByteFrequencyData(this.data), this.data;
    }
}





