
const youtubeFrame = document.getElementById("youtube");

document.onload = function(ev){
    console.log("I DID A THINGK", ev);
    const location = new URL(window.location);
    const type = location.searchParams.get("type");
    switch(type){
        case "youtube":
            const youtube = new YouTubeParser(location.searchParams.get("url"));
            youtubeFrame.url = youtube.embedURL.href;
        break;
    }
}