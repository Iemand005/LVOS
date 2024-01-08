navigator.getUserMedia( {audio: true, video: false},
    stream => {
        video.srcObject = videoStream = stream;
        video.src = window.URL.createObjectURL(videoStream)
        if(typeof MediaRecorder !== 'undefined') recorder = new MediaRecorder(stream);
    }, exception => console.error(exception)
);