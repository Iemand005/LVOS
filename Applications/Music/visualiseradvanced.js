
function microphoneActivated(stream){
    const visualiser = new AudioVisualiser(frequencies);
    visualiser.initializeWithMediaStream(stream);
    animateFrame(visualiser);
}

micButton.onclick = function(ev){
    navigator.getUserMedia({audio: true, video: false}, e=>microphoneActivated(e), e=>console.error(e.message))
}



