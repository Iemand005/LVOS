// Canvas for physics simulation using Ver/*let*/var integration methods (not finished but functional)
// Lasse © 2023
// 30/12/2023

'use strict';
'use esnext';

/*const*/var canvas = document.querySelector("canvas");
/*const*/var ctx = canvas.getContext("2d");

function drawCircle(ball){
    ctx.beginPath();
    ctx.arc(10, 10, 10, 0, 2 * Math.PI); // 360 degrees is equal to 2π srad
    ctx.stroke();
}

function renderFrame(balls){
    console.log(balls);
    balls.forEach(function(ball){
        console.log(ball, Ball.prototype);
        ball.update();
        drawCircle(ball);
    });
}

function startEngine(){
    /*const*/var balls = new BallCollection(10);
    window.setInterval(renderFrame, 1000, balls.balls);
}

//startEngine();