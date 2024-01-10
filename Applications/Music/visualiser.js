
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
        this.source = this.analyser.context.createMediaElementSource(element);
    },

    initializeWithMediaStream: function(stream){
        this.source = this.analyser.context.createMediaStreamSource(stream);
    },
    startAnalyser: function(fttSize){
        this.source.connect(this.analyser);
        
        this.analyser.fftSize = fttSize || 64;
        this.data = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(this.data);
    }
}

const file = document.getElementById("file");
const audio = document.getElementsByTagName("audio")[0];

file.onchange = function(ev){
    console.log("File received!", ev);
    audio.src = URL.createObjectURL(this.files[0]);
    const audioContext = new AudioContext(),
        source = audioContext.createMediaElementSource(audio),
        analyser = audioContext.createAnalyser();
    
    
    doAnalStuff(analyser, source);
}

function doAnalStuff(analyser, source){

    src.connect(analyser);
    analyser.connect(audioContext.destination);
    analyser.fftSize = 32;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    for (var i = 0; i < bufferLength; i++) console.log(barHeight = dataArray[i])
}

function animateFrame(e){
    requestAnimationFrame(animateFrame);
    console.log(e)
}



