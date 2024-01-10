
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

const file = document.getElementById("file");
const audio = document.getElementsByTagName("audio")[0];

const eudioVisualiser = new AudioVisualiser;

eudioVisualiser.initializeWithMediaElement(audio);

eudioVisualiser.start();

const elements = [];

for (let i = 0; i < eudioVisualiser.analyser.frequencyBinCount; i++) {
    const element = document.createElement("p");
    elements.push(element);
    document.appendChild(element);
}
 

function animateFrame(e){
    requestAnimationFrame(animateFrame);
    for(let index in eudioVisualiser.analyserData){
        elements[index].innerText = eudioVisualiser.analyserData[index];
    }
    //console.log(e)
}

animateFrame();



