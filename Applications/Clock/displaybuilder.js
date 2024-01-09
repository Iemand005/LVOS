
function DisplayBuilder(number, index, singular){
    this.display;
    this.index = index || 0;
    console.log(this.index)
    this.number= number || 0;
    this.segments = [];
    this.size = 50;
    this.fat = 10;
    this.singular = !!singular;
    if(singular) this.singular = true
}

function tokenizeNumber(number){
    console.log(number)
    //if(number>0)

    return (typeof number ==='number') && number>-100? (number>=0?[parseInt((number % 1000)/100), parseInt((number % 100) / 10), parseInt(number % 10)] // There are probably better ways to do this but this was the first I came up with and it works for now.
    ://else
    [number>-10?11:number<=-100?parseInt((number % 1000)/100):10, number>-10?10:0-parseInt((number % 100) / 10), 0-parseInt(number % 10)])
    :[10, 10, 10];
    //return [Math.floor(number % 10), Math.floor((number % 100) / 10), Math.floor((number % 1000)/100)]; // There are probably better ways to do this but this was the first I came up with and it works for now.
}

displayNumbers = [
    [true, true, true, false, true, true, true],
    [false, false, true, false, false, true, false],
    [true, false, true, true, true, false, true],
    [true, false, true, true, false, true, true],
    [false, true, true, true, false, true, false],
    [true, true, false, true, false, true, true],
    [true, true, false, true, true, true, true],
    [true, false, true, false, false, true, false],
    [true, true, true, true, true, true, true],
    [true, true, true, true, false, true, true],
    [false, false, false, true, false, false, false],
    [false, false, false, false, false, false, false],
]

DisplayBuilder.prototype = {
    number: 1,
    build: function(){
        const display = document.createElement("div");
        display.classList.add("segmentdisplay");
        if(this.singular) display.classList.add("singular");
        for (let i = 0; i < 7; i++) {
            const segment = display.appendChild(document.createElement("div"));
            this.segments.push(segment);
            //if(i==0 || i==3 || i==6) segment.classList.add("segmentx");
            if(i==1 || i==2 || i==4 || i==5) segment.classList.add("segmenty");
            if(i==2 || i==5) segment.classList.add("segmentr");
            if(i==3 || i==6) segment.classList.add("segmenth");
        }
        return display;
    },
    update: function(number){
        this.segments.forEach(function(segment, index){
            //console.log(number, number*-1)
            //console.log(number>=0 && number<=10)
            if(!displayNumbers[number>=0 && number<=11?number: 0][index]) segment.style.opacity = "0.1";
            else segment.style.opacity = "1";
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

function MultiDigitDisplayBuilder(digits, number){
    this.displays = [];
    this.digits = digits
    for (let i = 0; i < this.digits; i++) {
        this.displays.push(new DisplayBuilder(number, i));
    }    
}

MultiDigitDisplayBuilder.prototype = {
    build: function(target){
        this.displays.forEach(function(display){
            target.appendChild(display.build());
        });
    },
    update: function(number){
        //console.log("9".repeat(this.digits), this.digits)
        const max = "9".repeat(this.digits);
        this.displays.forEach(function(display, index){
            display.update(max>number?tokenizeNumber(number)[index]:9);
        });
    }
}