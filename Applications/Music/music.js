// Scripts for the front end of the music application
// Lasse Lauwerys © 2023

'use strict';
'use esnext';
'use moz';

/*const*/var frequencies = 128;

/*const*/var micButton = document.getElementById("mic");
/*const*/var virtualAudio = document.createElement("audio");
/*const*/var file = document.getElementById("file");
/*const*/var audio = document.getElementsByTagName("audio")[0];
/*const*/var visualiser = document.getElementById("visualiser");
/*const*/var ctx = visualiser.getContext("2d");
/*const*/var fullscreen = document.getElementById("fullscreen");
/*const*/var volume = document.getElementById("volume");
/*const*/var seek = document.getElementById("seek");
/*const*/var play = document.getElementById("play");
/*const*/var options = document.getElementById("options");
/*const*/var seekOutput = document.getElementById("seek-output");
/*const*/var volumeOutput = document.getElementById("volume-output");
/*const*/var fft = document.getElementById("fft");
/*const*/var visualiserOption = document.getElementById("style");
/*const*/var elements = [];

ctx.globalAlpha = 0.1;

function localFullscreen() {
    // document.body.requestFullscreen({navigationUI: ""});
    if (document.body.requestFullscreen) document.body.requestFullscreen();
    else if (document.body.msRequestFullscreen) document.body.msRequestFullscreen();
}

fullscreen.onclick = function(){
    localFullscreen();
    Messenger.broadcastToParent(Messenger.types.launchOverlay, "", "music");
}

/*let*/var audioVisualiser;
/*let*/var circular = true;
/*let*/var clear = false;
/*const*/var colorBuffer = [0, 0];
/*const*/var valueBuffer = new Array(30);

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
    refresh();
    //seekOutput.innerText = parseInt(audio.currentTime/60) +":" + parseInt(audio.currentTime%60) + "."+ parseInt(audio.currentTime%1/0.01);
    /*const*/var width = ctx.canvas.width = visualiser.clientWidth;
    /*const*/var height = ctx.canvas.height = visualiser.clientHeight;
    seek.value = audio.currentTime;

    /*const*/var freqData = audioVisualiser.frequencyData;
    /*const*/var timeData = audioVisualiser.timeDomainData;
    /*const*/var count = timeData.length;
    
    /*let*/var cX = width/2;
    /*let*/var cY = height/2;
    /*const*/var hue = time/321;
    /*const*/var a = 70;
    ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.fill();
    if(visualiserOption.selectedIndex){
        /*let*/var rad = 0, inc = Math.PI*2*(1/count);
        ctx.lineWidth = 100;
        for(/*let*/var index in timeData){
            /*const*/var amp = parseInt(timeData[index]);

            /*const*/var a = parseInt(freqData[index]);

            /*const*/var x = (amp) * Math.cos(rad) + cX;
            /*const*/var y = (amp) * Math.sin(rad) + cY;
            ctx.beginPath();

            ctx.fillStyle = "hsl(" + hue + ",100%,"+ a/255*100 +"%)";

            ctx.arc(x, y, 10, 0, Math.PI*2);
            ctx.fill();
            // ctx.closePath();

            rad += inc;
        }
    } else for(/*let*/var index in freqData){
    ctx.beginPath();

        /*const*/var amp = parseInt(freqData[index]);
        /*const*/var x = parseInt(index) * (width/count);
        ctx.fillStyle = "hsl(" + hue + ",100%,"+ amp/255*100 +"%)";
        ctx.fillRect(x, ctx.canvas.height, ctx.canvas.width/count, -(ctx.canvas.height/256 *amp));
        ctx.fill();
    // ctx.closePath();
    }
    
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
    if(audioVisualiser) audioVisualiser.destroy();
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

/*let*/var timeout;
function autoHideControls(){
    document.body.classList.remove("full");
    clearTimeout(timeout);
    timeout = setTimeout(options.classList.add.bind(document.body.classList, "full"), 3000);
}

console.error("Implement the URL replacement for older browsers!")
if(new URL(window.location).searchParams && new URL(window.location).searchParams.get("fullscreen")) {
    autoHideControls();
    document.onmousemove = autoHideControls;
}

function refresh(){
    /*const*/var m = parseInt(audio.currentTime/60);
    /*const*/var s = parseInt(audio.currentTime%60);
    /*const*/var ms = parseInt(audio.currentTime%1/0.01);
    /*const*/var text = (m<10?"0"+m:m) +":" +( s<10?"0"+s:s) + "."+ (ms<10?"0"+ms:ms);
    seekOutput.innerText = text;
}