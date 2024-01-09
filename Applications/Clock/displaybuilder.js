
function DisplayBuilder(number){

}

DisplayBuilder.prototype = {
    build: function(){
        const display = document.createElement("div");
        display.classList.add("segmentdisplay");
        for (let i = 0; i < 7; i++) {
            const segment = display.appendChild(document.createElement("div"));
            if(i==0 || i==3 || i==6) segment.classList.add("segmentx");
            if(i==1 || i==2 || i==4 || i==5) segment.classList.add("segmenty");
            if(i==2 || i==5) segment.classList.add("segmentr");
            if(i==3 || i==6) segment.classList.add("segmenth");
        }
        return display;
    }
}