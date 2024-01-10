
const micButton = document.getElementById("mic");
const virtualAudio = document.createElement("audio");
const file = document.getElementById("file");
const audio = document.getElementsByTagName("audio")[0];
const visualiser = document.getElementById("visualiser");
const ctx = visualiser.getContext("2d");

const elements = [];


 

function animateFrame(eudioVisualiser){
    //window.setTimeout(new Function(), 1000);
    requestAnimationFrame(animateFrame.bind(this, eudioVisualiser));
    for(let index in eudioVisualiser.data){
        //elements[index].innerText = eudioVisualiser.data[index];
        const amp = eudioVisualiser.data[index];
        const count = eudioVisualiser.frequencyBinCount;
        const x = index * (ctx.canvas.width/count);
        const x1 = (index+1) * (ctx.canvas.width/count);
        ctx.fillStyle = "red"
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
// console.log(x*index)
        ctx.beginPath();
        
        ctx.fillRect(0, 10, 10, 10);
        ctx.fillText(amp, 10, 10);
        ctx.fillStyle = "green"
        ctx.fillRect(10, 10, 10, amp*10 + 30);
        ctx.fill();
        ctx.closePath();
    }
    
    //console.log(e)
}

//setInterval(animateFrame, 1000);

file.onchange = function(ev){
    audio.src = URL.createObjectURL(this.files[0]);
    audio.load();
    audio.play();
    const eudioVisualiser = new AudioVisualiser(32);
    /*for (let i = 0; i < eudioVisualiser.frequencyBinCount; i++) {
        const element = document.createElement("p");
        elements.push(element);
        element.innerText = "hey"
        document.body.appendChild(element);
    }*/
    eudioVisualiser.initializeWithMediaElement(audio);
    animateFrame(eudioVisualiser);
    //setInterval(animateFrame, 1000, eudioVisualiser);
}