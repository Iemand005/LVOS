
// document.appendChild(document.getElementById("file"))

const file = document.getElementById("file");
const audio = document.getElementsByTagName("audio")[0];

file.onchange = function(ev){
    console.log("File received!", ev);
    audio.src = URL.createObjectURL(this.files[0]);
    const ctx = new AudioContext(),
        src = ctx.createMediaElementSource(audio),
        analyser = ctx.createAnalyser();
    src.connect(analyser);
    analyser.connect(ctx.destination);
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