// Camera app by Lasse
// Lasse Lauwerys © 2023
// Created: 30/12/2023
// Target: ES6 (Dropped support for IE11!)

'use strict';

var video = document.getElementById("camera");
var output = document.getElementById("picture");
var takeVideo = document.getElementById("video");
var takePhoto = document.getElementById("photo");
var startButton = document.getElementById("start");
var captureCard = document.createElement("canvas"); //document.getElementById("capture");

var recorder;
var videoStream;
var front = true;

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
            if(typeof MediaRecorder != 'undefined') recorder = new MediaRecorder(stream);
        },
        exception => console.error(exception)
    );
}

startButton.onclick = getCamera;

takePhoto.onclick = function(ev) {
    ev.preventDefault();
    var photo = getPhoto(video, video.videoWidth, video.videoHeight);
    console.log("foto", photo);
    output.setAttribute("src", photo);
};

function getStreamInfo(stream){
    return stream.getVideoTracks()[0].getSettings();
}

function getPhoto(videa, width, height){
    captureCard.width = width;
    captureCard.height = height;
    captureCard.getContext("2d").drawImage(videa, 0, 0, width, height);
    return captureCard.toDataURL("image/png");
}

//getCamera();

//takeVideo.onclick = 
