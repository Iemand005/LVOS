
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
const fft = document.getElementById("fft");
const elements = [];

const transitionspeed = 5000000;
let lol = {red:0, green: 0, blue:0};
let previousLol = {red:0, green: 0, blue:0};
let emo =  {red:0, green: 0, blue:0};

fullscreen.onclick = function(){
    Messenger.broadcastToParent(Messenger.types.launchOverlay);
}

function animateFrame(eudioVisualiser, time){
    // console.log(e)
    requestAnimationFrame(animateFrame.bind(this, eudioVisualiser));
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    // ctx.fillStyle = "red"
    for(let key in lol) {
        if(random(10, 0)*transitionspeed < time) previousLol[key] = lol[key], lol[key] = Math.random();
        emo[key] = lerp(previousLol[key], lol[key], transitionspeed/time);
    }
    console.log(emo)
    seekOutput.innerText = parseInt(audio.currentTime/60) +":" + parseInt(audio.currentTime%60) + "."+ parseInt(audio.currentTime%1/0.01);
    ctx.canvas.width = visualiser.clientWidth;
    ctx.canvas.height = visualiser.clientHeight;
    seek.value = audio.currentTime;

    const count = eudioVisualiser.frequencyBinCount;
    const width = ctx.canvas.width/count;

    for(let index in eudioVisualiser.data){
        const amp = parseInt(eudioVisualiser.data[index]);
        const x = index * width;
        const red = amp+emo.red, green = amp+emo.green, blue = amp+emo.blue;
        ctx.fillStyle = "rgb(" + red + "," + green + "," + blue + ")";
        ctx.beginPath();
        ctx.fillRect(x, ctx.canvas.height, width, -(ctx.canvas.height/256 *amp));
        ctx.fill();
        ctx.closePath();
    }
}

function startAnimation(audioVisualiser){
    fft.oninput = function(){
        audioVisualiser.updateBinCount(Math.pow(2, this.value)); // "2 ** this.value" works in more modern browsers too.
    }
    animateFrame(audioVisualiser);
}

file.onchange = function(ev){
    audio.src = URL.createObjectURL(this.files[0]);
    audio.load();
    const auidoVisualiser = new AudioVisualiser(frequencies);
    auidoVisualiser.initializeWithMediaElement(audio);
    startAnimation(auidoVisualiser);
    seek.max = audio.duration;
    volume.value = audio.volume*100;
    // fft.oninput = function(){
    //     auidoVisualiser.updateBinCount(Math.pow(2, this.value)); // "2 ** this.value" works in more modern browsers too.
    // }
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