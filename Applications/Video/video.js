// Video player (for video files and YouTube) Not yet finished.
// Lasse Lauwerys � 2024

'use strict';

var youtubeFrame = document.getElementById("youtube");

document.onload = function (ev) {
    console.log("I DID A THINGK", ev);
    var location = new URL(window.location);
    var type = location.searchParams.get("type");
    switch (type) {
        case "youtube":
            /*const*/var youtube = new YouTubeParser(location.searchParams.get("url"));
            youtubeFrame.url = youtube.embedURL.href;
            break;
    }
};