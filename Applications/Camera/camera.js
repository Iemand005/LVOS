// Camera app by Lasse
// Lasse Lauwerys © 2023
// Created: 30/12/2023
// Target: ES6 (Dropped support for IE11!)

'use strict';
'use esnext';
'use esnext';
'use moz';

/*const*/var video = document.getElementById("camera");
/*const*/var output = document.getElementById("picture");
/*const*/var takeVideo = document.getElementById("video");
/*const*/var takePhoto = document.getElementById("photo");
/*const*/var startButton = document.getElementById("start");
/*const*/var captureCard = document.createElement("canvas"); //document.getElementById("capture");

/*let*/var recorder;
/*let*/var videoStream;
/*let*/var front = true;

function cameraAccepted(stream){
    video.srcObject = stream;
}

function cameraDenied(){

}

function getCamera(){
    // await navigator.getUserMedia({audio: true, video: { facingMode: front ? "user" : "environment" }}, cameraAccepted, cameraDenied);
    navigator.getUserMedia(
        {
            audio: true,
            video: {
                facingMode: front ? "user" : "environment"
            }
        },
        stream => {
            video.srcObject = videoStream = stream;
            video.src = window.URL.createObjectURL(videoStream)
            if(typeof MediaRecorder !== 'undefined') recorder = new MediaRecorder(stream);
        },
        exception => console.error(exception)
    );
}

startButton.onclick = getCamera;

takePhoto.onclick = ev => {
    ev.preventDefault();
    /*const*/var photo = getPhoto(video, video.videoWidth, video.videoHeight);
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