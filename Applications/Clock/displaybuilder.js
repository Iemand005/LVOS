
function DisplayBuilder(number){
    this.display;
    this.number= number || 0;
    this.segments = [];
}

displayNumbers = [
    [true, true, true, false, true, true, true],
    [false, false, true, false, false, true, false],
    [true, false, true, true, true, false, true],
    [true, false, true, true, false, true, true],
    [false, true, true, true, false, true, false],
    [true, true, false, true, false, true, true],
    [true, true, false, true, true, true, true],
    [true, true, true, false, false, true, false],
    [true, true, true, true, true, true, true],
    [true, true, true, true, false, true, true],
]

DisplayBuilder.prototype = {
    number: 1,
    build: function(){
        const display = document.createElement("div");
        display.classList.add("segmentdisplay");
        for (let i = 0; i < 7; i++) {
            const segment = display.appendChild(document.createElement("div"));
            this.segments.push(segment);
            if(i==0 || i==3 || i==6) segment.classList.add("segmentx");
            if(i==1 || i==2 || i==4 || i==5) segment.classList.add("segmenty");
            if(i==2 || i==5) segment.classList.add("segmentr");
            if(i==3 || i==6) segment.classList.add("segmenth");
        }
        return display;
    },
    update: function(number){
        //let i = 0;
        this.segments.forEach(function(segment, index){
            //i++
            console.log(displayNumbers, this.number)
            if(!displayNumbers[number || 0][index]) {
                segment.style.opacity = "0";
            } else segment.style.opacity = "1";
        });
    }
}