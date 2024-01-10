
const frequencies = 128;

const micButton = document.getElementById("mic");
const virtualAudio = document.createElement("audio");
const file = document.getElementById("file");
const audio = document.getElementsByTagName("audio")[0];
const visualiser = document.getElementById("visualiser");
const ctx = visualiser.getContext("2d");
const fullscreen = document.getElementById("fullscreen");
const volume = document.getElementById("volume");
const seek = document.getElementById("seek");
const play = document.getElementById("play");
const options = document.getElementById("options");
const seekOutput = document.getElementById("seek-output");
const volumeOutput = document.getElementById("volume-output");
const elements = [];


fullscreen.onclick = function(){
    Messenger.broadcastToParent(Messenger.types.launchOverlay);
}

function animateFrame(eudioVisualiser){
    requestAnimationFrame(animateFrame.bind(this, eudioVisualiser));
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    ctx.fillStyle = "red"

    seekOutput.innerText = parseInt(audio.currentTime/60) +":" + parseInt(audio.currentTime%60) + "."+ parseInt(audio.currentTime%1/0.01);
    ctx.canvas.width = visualiser.clientWidth;
    ctx.canvas.height = visualiser.clientHeight;
    seek.value = audio.currentTime;

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
    const eudioVisualiser = new AudioVisualiser(frequencies);
    eudioVisualiser.initializeWithMediaElement(audio);
    animateFrame(eudioVisualiser);
    seek.max = audio.duration;
    volume.value = audio.volume*100;
}

options.onsubmit = function(ev){
    ev.preventDefault();
}

// play.onclick = function(){
//     audio.play();
//     // if(audio.)this.COMMENT_NODE
// }

play.onclick = audio.play.bind(audio);

audio.onplaying = function(){
    play.innerText = "⏸︎";
    play.onclick = audio.pause.bind(audio);
}

audio.onpause = function(){
    play.innerText = "⏵︎";
    play.onclick = audio.play.bind(audio);
}

seek.oninput = function(ev){
    audio.currentTime = this.value;
}

volume.oninput = function(ev){
    audio.volume = (this.value>100?100:this.value<0?0:this.value)/100;
}

function refresh(){
    seekOutput.innerText = parseInt(audio.currentTime/60) +":" + parseInt(audio.currentTime%60) + "."+ parseInt(audio.currentTime%1/0.01);
    audio.currentTime
}

//setInterval(refresh, 100);