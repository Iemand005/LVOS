// Velocity API demo!

'use strict';
'use esnext';
window.addEventListener('message', function (event) {
    const stats = JSON.parse(event.data).data;
    if(!stats) return;
    document.querySelector("output").innerText = "x: "+stats.difference.x + " y:" +stats.difference.y;
    const canvas = document.querySelector("canvas");
    const ctx = canvas.getContext("2d");
    const width = window.innerWidth, height = 100;

    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();
    ctx.moveTo(width/2, height/2);
    ctx.lineTo(width/2 - 3*stats.difference.x, height/2 - 3*stats.difference.y);
    ctx.stroke();
});