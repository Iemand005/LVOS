
const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");

function drawCircle(ball){
    ctx.beginPath();
    //ctx.moveTo(0, 0);
    ctx.arc(10, 10, 10, 0, 2 * Math.PI); // 360 degrees is equal to 2π
    ctx.stroke();
}

function renderFrame(balls){
    console.log(balls)
    balls.forEach(function(ball){
        console.log(ball);
        ball.update();
        drawCircle(ball);
    });
}

function startEngine(){
    const balls = new BallCollection(10);
    window.setInterval(renderFrame, 1000, balls.balls);
}

startEngine();