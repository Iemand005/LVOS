
// navigator.getUserMedia( {audio: true, video: false},
//     stream => {
//         video.srcObject = videoStream = stream;
//         video.src = window.URL.createObjectURL(videoStream)
//     }, exception => console.error(exception)
// );

function microphoneActivated(stream){
    //virtualAudio.srcObject = stream;
    constext.createMediaStreamSource(stream).connect(audioAnalyser);
    audioAnalyser.connect(constext.destination);
}

micButton.onclick = function(ev){
    navigator.getUserMedia({audio: true, video: false}, e=>microphoneActivated(e), e=>console.error(e.message))
}



