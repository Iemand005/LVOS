
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
const visualiserOption = document.getElementById("style");
const elements = [];

ctx.globalAlpha = 0.1;

fullscreen.onclick = function(){
    Messenger.broadcastToParent(Messenger.types.launchOverlay, "", "music");
}

let audioVisualiser;
let circular = true;
let clear = false;
const colorBuffer = [0, 0];
const valueBuffer = new Array(30);

function animateFrame(audioVisualiser, time){

    requestAnimationFrame(animateFrame.bind(this, audioVisualiser));
    if(clear) ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    else {
        ctx.fillStyle = "#FF000099"
        ctx.beginPath();
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.fill();
        ctx.closePath();
    }
    seekOutput.innerText = parseInt(audio.currentTime/60) +":" + parseInt(audio.currentTime%60) + "."+ parseInt(audio.currentTime%1/0.01);
    const width = ctx.canvas.width = visualiser.clientWidth;
    const height = ctx.canvas.height = visualiser.clientHeight;
    seek.value = audio.currentTime;

    const freqData = audioVisualiser.frequencyData;
    const timeData = audioVisualiser.timeDomainData;
    const count = timeData.length;
    
    let cX = width/2;
    let cY = height/2;
    const hue = time/321;
    const a = 70;
    ctx.beginPath();
    if(visualiserOption.selectedIndex){
        let rad = 0, inc = Math.PI*2*(1/count);
        ctx.lineWidth = 100;
        for(let index in timeData){
            const amp = parseInt(timeData[index]);

            const a = parseInt(freqData[index]);

            const x = (amp) * Math.cos(rad) + cX;
            const y = (amp) * Math.sin(rad) + cY;
            ctx.beginPath();

            ctx.fillStyle = "hsl(" + hue + ",100%,"+ a/255*100 +"%)";

            ctx.arc(x, y, 10, 0, Math.PI*2);
            ctx.fill();
            ctx.closePath();

            rad += inc;
        }
    } else for(let index in freqData){
        const amp = parseInt(freqData[index]);
        const x = parseInt(index) * (width/count);
        ctx.fillStyle = "hsl(" + hue + ",100%,"+ amp/255*100 +"%)";
        ctx.fillRect(x, ctx.canvas.height, ctx.canvas.width/count, -(ctx.canvas.height/256 *amp));
    }
    ctx.fill();
    ctx.closePath();
}

function startAnimation(audioVisualiser){
    fft.oninput = function(){
        audioVisualiser.updateBinCount(Math.pow(2, this.value)); // "2 ** this.value" works in more modern browsers too.
    }
    animateFrame(audioVisualiser);
}

file.onchange = function(){
    audio.src = URL.createObjectURL(this.files[0]);
    audio.load();
    if(audioVisualiser) audioVisualiser.dump();
    audioVisualiser = new AudioVisualiser(frequencies);
    audioVisualiser.initializeWithMediaElement(audio);
    startAnimation(audioVisualiser);
    volume.value = audio.volume*100;
}

audio.oncanplay = function(){
    seek.max = audio.duration;
}

options.onsubmit = function(ev){
    ev.preventDefault();
}

play.onclick = audio.play.bind(audio);

audio.onplaying = function(){
    play.innerText = "⏸︎";
    play.onclick = audio.pause.bind(audio);
    audioVisualiser.initializeWithMediaElement(audio);

    // audioVisualiser.connectElement();
}

audio.onpause = function(){
    play.innerText = "⏵︎";
    play.onclick = audio.play.bind(audio);
    // audioVisualiser.connectStream();
}

seek.oninput = function(ev){
    audio.currentTime = this.value;
}

volume.oninput = function(ev){
    audio.volume = (this.value>100?100:this.value<0?0:this.value)/100;
}

function autoHideControls(){
    document.body.classList.remove("full");
    clearTimeout(timeout);
    timeout = setTimeout(options.classList.add.bind(document.body.classList, "full"), 3000);
}

let timeout;
if(new URL(window.location).searchParams.get("fullscreen")) {
    autoHideControls();
    document.onmousemove = autoHideControls;
}

Messenger.receive(function(type, message){
    switch(type){
        case Messenger.types.prepareToLaunchOverlay:
            options.style.display = "none";
            Messenger.broadcastToParent(Messenger.types.readyToLaunchOverlay, "ready", "music");
            break;
    }
});

function refresh(){
    const ms = parseInt(audio.currentTime%1/0.01);
    let mst = parseInt(ms%1/0.01) + ""
    mst +=" ".repeat(e.length%2);
    const text = parseInt(audio.currentTime/60) +":" + parseInt(audio.currentTime%60) + "."+ mst;
    seekOutput.innerText = text;// + ' '.repeat(text.length%20)
}