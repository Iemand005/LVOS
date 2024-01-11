// Audio visualiser with vanilla JavaScript
// Lasse Lauwerys © 2024
// 10/1/2024

function AudioVisualiser(fftSize){
    // this.context;
    // this.analyser;
    this.context = new AudioContext;
    this.analyser = this.context.createAnalyser();
    this.elementSource;
    this.streamSource;
    // this.initialize();
    this.updateBinCount(fftSize);
}

AudioVisualiser.prototype = {
    _frequencyData: new Uint8Array(),
    _timeDomainData: new Uint8Array(),

    // initialize: function(){
    //     // this.disconnectAnalyser();
        
    // },

    // connectElement: function(){
    //     this.elementSource.connect(this.analyser);
    // },

    // connectStream: function(){
    //     this.streamSource.connect(this.analyser);
    // },

    // connectAnalyser: function(){
    //     this.analyser.connect(this.context.destination);
    // },

    dump: function(){
        this.analyser.disconnect();
    },

    disconnectAnalyser: function(){
        if(this.analyser && this.analyser.disconnect) this.analyser.disconnect();
    },

    initializeWithMediaElement: function(element){
        // this.initialize();
        // if(this.elementSource){
        //     this.elementSource.disconnect();
        // }
        this.source = this.context.createMediaElementSource(element);
        this.source.connect(this.analyser);
        // this.connectAnalyser();
        this.analyser.connect(this.context.destination);
    },

    initializeWithMediaStream: function(stream){
        // this.disconnectAnalyser();
        // if(this.source){
        //     this.source.disconnect();
        // }
        this.source = this.context.createMediaStreamSource(stream);
        this.source.connect(this.analyser);
        this.analyser.connect(this.context.destination);
        // this.connectAnalyser();
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