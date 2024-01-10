
const micButton = document.getElementById("mic");
const virtualAudio = document.createElement("audio");

micButton.onclick = function(ev){
    navigator.getUserMedia({audio: true, video: false}, e=>console.log(e), e=>console.log(e))

}

function microphoneActivated(stream){

}