
const micButton = document.getElementById("mic");
const virtualAudio = document.createElement("audio");
const file = document.getElementById("file");
const audio = document.getElementsByTagName("audio")[0];

const eudioVisualiser = new AudioVisualiser;

eudioVisualiser.initializeWithMediaElement(audio);

eudioVisualiser.start();

const elements = [];

for (let i = 0; i < eudioVisualiser.analyser.frequencyBinCount; i++) {
    const element = document.createElement("p");
    elements.push(element);
    document.body.appendChild(element);
}
 

function animateFrame(e){
    requestAnimationFrame(animateFrame);
    for(let index in eudioVisualiser.analyserData){
        elements[index].innerText = eudioVisualiser.analyserData[index];
    }
    //console.log(e)
}

animateFrame();

micButton.onclick = function(ev){
    navigator.getUserMedia({audio: true, video: false}, e=>microphoneActivated(e), e=>console.error(e.message))

}

function microphoneActivated(stream){
    //virtualAudio.srcObject = stream;
    constext.createMediaStreamSource(stream).connect(audioAnalyser);
    audioAnalyser.connect(constext.destination);
}