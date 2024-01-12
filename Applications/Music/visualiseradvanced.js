// Advanced visualiser scripts
// These are in a separate file because they use ECMAScript 6 standards, which is only supported in new browsers. (2015+)

'use strict';
'use esnext';
'use moz';

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
    if(isActive) stop(); // Not all browsers support this syntax "e => console.log(e)". It's also not recognised by VS2013. I'll be using brackets around single parameters for arrow notation, "(e) => console.log(e)".
    else navigator.getUserMedia({audio: true, video: false}, e=>microphoneActivated(e), e=>console.error(e.message))
}



