
function DisplayBuilder(number, index){
    this.display;
    this.index = index || 0;
    this.number= number || 0;
    this.segments = [];
    this.size = 50;
    this.fat = 10;
}

function tokenizeNumber(number){
    return [Math.floor(139 % 10), Math.floor((160 % 100) / 10), Math.floor((number % 1000)/100)]; // There are probably better ways to do this but this was the first I came up with and it works for now.
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
                segment.style.opacity = "0.1";
            } else segment.style.opacity = "1";
        });
    },
    resize: function(size, fat){

        document.querySelectorAll("div.segmentdisplay > div").forEach(function(element){
            element.style.borderWidth = fat + "px";
        });
        document.querySelectorAll("div.segmentdisplay > div.segmentx").forEach(function(element){
            element.style.marginLeft = fat + "px";
            element.style.width = size + "px";
        });

        document.querySelectorAll("div.segmentdisplay > div.segmenty").forEach(function(element){
            //element.style.marginLeft = fat + "px";
            element.style.height = size + "px";
        });
        document.querySelectorAll("div.segmentdisplay > div.segmentr").forEach(function(element){
            element.style.marginLeft = size + fat*2 + "px";
            element.style.marginTop = -(size + fat*2) + "px";
            element.style.marginBottom = fat + "px";
            console.log(this, element)
        });
    }
}