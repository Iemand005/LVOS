
// document.appendChild(document.getElementById("file"))

const file = document.getElementById("file");
const audio = document.getElementsByTagName("audio")[0];

file.onchange = function(ev){
    console.log("File received!", ev);
    audio.src = URL.createObjectURL(this.files[0]);
    const audioContext = new AudioContext(),
        source = audioContext.createMediaElementSource(audio),
        //src = audioContext.createMediaStreamSource()
        analyser = audioContext.createAnalyser();
    src.connect(analyser);
    
    doAnalStuff(analyser);
}

function doAnalStuff(analyser, context){

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



