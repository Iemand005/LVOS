// Camera app by Lasse
// Lasse Lauwerys © 2023
// Created: 30/12/2023
// Target: ES6 (Dropped support for IE11!)

const video = document.getElementById("camera");
const output = document.getElementById("picture");
const takeVideo = document.getElementById("video");
const takePhoto = document.getElementById("photo");
const startButton = document.getElementById("start");
const captureCard = document.createElement("canvas"); //document.getElementById("capture");

let recorder;
let videoStream;
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
        stream => (video.srcObject = videoStream = stream, recorder = new MediaRecorder(stream)),
        exception => console.error(exception)
    );
}

startButton.onclick = getCamera;

takePhoto.onclick = ev => {
    ev.preventDefault();
    //const info = getStreamInfo(videoStream);
    // const photo = getPhoto(videoStream, info.width, info.height);
    const photo = getPhoto(video, video.videoWidth, video.videoHeight);
    console.log("foto", photo)
    output.setAttribute("src", photo);
}

function getStreamInfo(stream){
    return stream.getVideoTracks()[0].getSettings();
}

function getPhoto(videa, width, height){
    captureCard.width = width;
    captureCard.height = height;
    captureCard.getContext("2d").drawImage(videa, 0, 0, width, height);
    return captureCard.toDataURL("image/png");
    photo.setAttribute("src", data);
}

//getCamera();

//takeVideo.onclick = 