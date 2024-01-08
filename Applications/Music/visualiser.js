
// document.appendChild(document.getElementById("file"))

const file = document.getElementById("file");
const audio = document.getElementsByTagName("audio")[0];

file.onchange = function(ev){
    console.log("File received!", ev);
    audio.src = URL.createObjectURL(this.files[0]);
    const audioContext = new AudioContext(),
        src = audioContext.createMediaElementSource(audio),
        //src = audioContext.createMediaStreamSource()
        analyser = audioContext.createAnalyser();
    src.connect(analyser);
    analyser.connect(audioContext.destination);
    doAnalStuff(analyser);
}

function doAnalStuff(analyser){
    analyser.fftSize = 32;
    const bufferLength = analyser.frequencyBinCount;
    console.log(bufferLength);
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    for (var i = 0; i < bufferLength; i++) console.log(barHeight = dataArray[i])
}

function animateFrame(e){
    requestAnimationFrame(animateFrame);
    console.log(e)
}



