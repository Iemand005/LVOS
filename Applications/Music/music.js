
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


fullscreen.onclick = function(){
    Messenger.broadcastToParent(Messenger.types.launchOverlay);
}

let circular = true;
let clear = false;
const colorBuffer = [0, 0];

function animateFrame(audioVisualiser, time){

    requestAnimationFrame(animateFrame.bind(this, audioVisualiser));
    if(clear) ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    else {
        // console.log("rat")
        ctx.fillStyle = "#FF000099"//"#00000010"
        ctx.beginPath();
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.fill();
        ctx.closePath();
    }
    seekOutput.innerText = parseInt(audio.currentTime/60) +":" + parseInt(audio.currentTime%60) + "."+ parseInt(audio.currentTime%1/0.01);
    const width = ctx.canvas.width = visualiser.clientWidth;
    const height = ctx.canvas.height = visualiser.clientHeight;
    seek.value = audio.currentTime;

    const data = audioVisualiser.timeDomainData;
    const count = data.length;
    
    let cX = width/8;
    let cY = height/8;
    const hue = time/321;
    ctx.beginPath();
    if(circular){
        let rad = 0, inc = Math.PI*2*(1/count);
        for(let index in data){
            const amp = parseInt(data[index]);
            const x = (amp + cX) * Math.cos(rad) + cX;
            const y = (amp + cX) * Math.sin(rad) + cY;
            ctx.beginPath();

            ctx.fillStyle = "hsl(" + hue + ",100%,50%)";
            ctx.beginPath();

            ctx.fillStyle = "hsl(" + hue + ",100%,50%)";

            ctx.arc(x, y, 2, 0, Math.PI*2);
            ctx.fill();
            ctx.closePath();

            rad += inc;
        }
    } else for(let index in data){
        const amp = parseInt(audioVisualiser.frequencyData[index]);
        const x = index * width;
        const red = amp+emo.red, green = amp+emo.green, blue = amp+emo.blue;
        ctx.fillStyle = "rgb(" + red + "," + green + "," + blue + ")";
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