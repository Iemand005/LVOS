
const video = document.getElementById("camera");
const startButton = document.getElementById("start");
const takeVideo = document.getElementById("camera");
const takePhoto = document.getElementById("camera");

let stream;
let front = true;

function cameraAccepted(stream){
    video.srcObject = stream;
}

function cameraDenied(){

}

async function getCamera(){
    // await navigator.getUserMedia({audio: true, video: { facingMode: front ? "user" : "environment" }}, cameraAccepted, cameraDenied);
    await navigator.getUserMedia(
        {
            audio: true,
            video: {
                facingMode: front ? "user" : "environment"
            }
        },
        stream => video.srcObject = stream,
        exception => console.error(exception)
    );
}

startButton.onclick = getCamera;

//getCamera();

//takeVideo.onclick = 