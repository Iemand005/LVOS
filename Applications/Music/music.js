
const micButton = document.getElementById("mic");
const virtualAudio = document.createElement("audio");
const constext = new AudioContext;
const audioAnalyser = new audioAnalyser;

micButton.onclick = function(ev){
    navigator.getUserMedia({audio: true, video: false}, e=>microphoneActivated(e), e=>console.error(e.message))

}

function microphoneActivated(stream){
    //virtualAudio.srcObject = stream;
    constext.createMediaStreamSource(stream).connect(audioAnalyser);
    audioAnalyser.connect(constext.destination);
}