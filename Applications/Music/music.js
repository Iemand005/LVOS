// Scripts for the front end of the music application
// Lasse Lauwerys © 2023

'use strict';
'use esnext';
'use moz';

{
var frequencies = 128;

var micButton = document.getElementById("mic");
var virtualAudio = document.createElement("audio");
var file = document.getElementById("file");
var audio = document.getElementsByTagName("audio")[0];
var visualiser = document.getElementById("visualiser");
var ctx = visualiser instanceof HTMLCanvasElement ? visualiser.getContext("2d") : null;
var fullscreen = document.getElementById("fullscreen");
var volume = document.getElementById("volume");
var seek = document.getElementById("seek");
var play = document.getElementById("play");
var options = document.getElementById("options");
var seekOutput = document.getElementById("seek-output");
var volumeOutput = document.getElementById("volume-output");
var fft = document.getElementById("fft");
var visualiserOption = document.getElementById("style");
let elements = [];
var audioVisualiser;
var circular = true;
var clear = false;
var colorBuffer = [0, 0];
var valueBuffer = new Array(30);

ctx.globalAlpha = 0.1;

function localFullscreen() {
    // document.body.requestFullscreen({navigationUI: ""});
    if (document.body.requestFullscreen) document.body.requestFullscreen();
    else if (document.body.msRequestFullscreen) document.body.msRequestFullscreen();
}

fullscreen.onclick = function(){
    localFullscreen();
    LVMessenger.broadcastToParent(LVMessenger.types.launchOverlay, "", "music");
}


function animateFrame(time){

    // requestAnimationFrame(animateFrame.bind(this, audioVisualiser));
    requestAnimationFrame(animateFrame);
    if(clear) ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    else {
        ctx.fillStyle = "#FF000099"
        ctx.beginPath();
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.fill();
        ctx.closePath();
    }
    refresh();
    //seekOutput.innerText = parseInt(audio.currentTime/60) +":" + parseInt(audio.currentTime%60) + "."+ parseInt(audio.currentTime%1/0.01);
    const width = ctx.canvas.width = visualiser.clientWidth;
    const height = ctx.canvas.height = visualiser.clientHeight;
    seek.value = audio.currentTime;

    const freqData = audioVisualiser.frequencyData;
    const timeData = audioVisualiser.timeDomainData;
    // const count = visualiserOption.frequ;
    const count = audioVisualiser.frequencyBinCount;
    
    /*let*/var cX = width/2;
    /*let*/var cY = height/2;
    const hue = time/321;
    const a = 70;
    ctx.fillStyle = "rgba(0, 0, 0, 0)";
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.fill();
    if(visualiserOption.selectedIndex){
        /*let*/var rad = 0, inc = Math.PI*2*(1/count);
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
            // ctx.closePath();

            rad += inc;
        }
    } else for(let index in freqData){
        // count = freqData.length;    
        ctx.beginPath();

        const amp = parseInt(freqData[index]);
        const x = parseInt(index) * (width/count);
        ctx.fillStyle = "hsl(" + hue + ",100%,"+ amp/255*100 +"%)";
        ctx.fillRect(x, ctx.canvas.height, ctx.canvas.width/count, -(ctx.canvas.height/256 *amp));
        ctx.fill();
    // ctx.closePath();
    }
    
}

function startAnimation(){
    fft.oninput = function(){
        audioVisualiser.updateBinCount(Math.pow(2, this.value)); // "2 ** this.value" works in more modern browsers too.
    }
    requestAnimationFrame(animateFrame);
}

file.onchange = function(){
    audio.src = URL.createObjectURL(this.files[0]);
    audio.load();
    if(audioVisualiser) audioVisualiser.destroy();
    audioVisualiser = new AudioVisualiser(frequencies);
    audioVisualiser.initializeWithMediaElement(audio);
    startAnimation(audioVisualiser);
    volume.value = audio.volume*100;
};

audio.oncanplay = function(){
    seek.max = audio.duration;
};

options.onsubmit = function(ev){
    ev.preventDefault();
};

// const playHandler = 
function playHandler() { audio.play(); }
function pauseHandler() { audio.pause(); }

play.onclick = playHandler;

audio.onplaying = function(){
    play.innerText = "⏸︎";
	play.onclick = pauseHandler;
    audioVisualiser.initializeWithMediaElement(audio);
}

audio.onpause = function(){
    play.innerText = "⏵︎";
    play.onclick = playHandler;
}

seek.oninput = function(ev){
    audio.currentTime = this.value;
}

volume.oninput = function(ev){
    audio.volume = (this.value>100?100:this.value<0?0:this.value)/100;
}

/*let*/var timeoute;
function autoHideControls(){
    document.body.classList.remove("full");
    clearTimeout(timeoute);
    timeoute = setTimeout(options.classList.add.bind(document.body.classList, "full"), 3000);
}

if(new URL(window.location).searchParams && new URL(window.location).searchParams.get("fullscreen")) {
    autoHideControls();
    document.onmousemove = autoHideControls;
}

function refresh(){
    const m = parseInt(audio.currentTime/60);
    const s = parseInt(audio.currentTime%60);
    const ms = parseInt(audio.currentTime%1/0.01);
    const text = (m<10?"0"+m:m) +":" +( s<10?"0"+s:s) + "."+ (ms<10?"0"+ms:ms);
    seekOutput.innerText = text;
}
}