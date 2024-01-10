
let isActive = false;
let stop = new Function;

function microphoneActivated(stream){
    isActive = true;
    const visualiser = new AudioVisualiser(frequencies);
    visualiser.initializeWithMediaStream(stream);
    startAnimation(visualiser);
    stop = endStream.bind(this, stream);
}

function endStream(stream){
    stream.getTracks().forEach(function(track) {
        track.stop();
    });
    isActive = false;
}

micButton.onclick = function(ev){
    if(isActive) stop();
    else navigator.getUserMedia({audio: true, video: false}, e=>microphoneActivated(e), e=>console.error(e.message))
}



