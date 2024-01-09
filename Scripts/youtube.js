
function YouTubeParser(url){
    this.url = url;
    //this._embedURL = new URL(this.url);
}

YouTubeParser.prototype.getEmbedURL = function(){
    "https://www.youtube.com/watch?v=2Ni13dnAbSA"
    "https://www.youtube.com/embed/2Ni13dnAbSA"
    "https://www.youtube.com/embed/tgbNymZ7vqY"

}
YouTubeParser.prototype = {
    get embedURL(){
        const url = new URL(this.url);
        url.pathname = "/embed/" + url.searchParams.get("v");
        url.searchParams.delete("v");
        return url;
    }
}