
const frequencies = 128;

const micButton = document.getElementById("mic");
const virtualAudio = document.createElement("audio");
const file = document.getElementById("file");
const audio = document.getElementsByTagName("audio")[0];
const visualiser = document.getElementById("visualiser");
const ctx = visualiser.getContext("2d");
const fullscreen = document.getElementById("fullscreen");
const elements = [];


fullscreen.onclick = function(){
    Messenger.broadcastToParent(Messenger.types.launchOverlay);
}

function animateFrame(eudioVisualiser){
    requestAnimationFrame(animateFrame.bind(this, eudioVisualiser));
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    ctx.fillStyle = "red"

    for(let index in eudioVisualiser.data){
        const amp = parseInt(eudioVisualiser.data[index]);
        const count = eudioVisualiser.frequencyBinCount;
        const width = ctx.canvas.width/count;
        const x = index * width;
        ctx.beginPath();
        ctx.fillRect(x, ctx.canvas.height, width, -(ctx.canvas.height/256 *amp));
        ctx.fill();
        ctx.closePath();
    }
}

file.onchange = function(ev){
    audio.src = URL.createObjectURL(this.files[0]);
    audio.load();
    audio.play();
    const eudioVisualiser = new AudioVisualiser(frequencies);
    eudioVisualiser.initializeWithMediaElement(audio);
    animateFrame(eudioVisualiser);
}