// 7 Segment display building tools
// Lasse Lauwerys � 2024

'use strict';
'use esnext';
'use moz';

/**
 * @param {number} number 
 * @param {number} index 
 * @param {boolean} singular 
 */
function DisplayBuilder(number, index, singular){
    this.display;
    this.index = index || 0;
    this.number= number || 0;
    this.segments = [];
    this.size = 50;
    this.fat = 10;
    this.singular = Boolean(singular);
    if (singular) this.singular = true;
}

function tokenizeNumber(number){ // There are probably better ways to do this but this was the first I came up with and it works for now.
    return typeof number ==='number' && number>-100? (number>=0?[parseInt((number % 1000)/100), parseInt((number % 100) / 10), parseInt(number % 10)]:[number>-10?11:number<=-100?parseInt((number % 1000)/100):10, number>-10?10:0-parseInt((number % 100) / 10), 0-parseInt(number % 10)]):[10, 10, 10];
}

/**
 * These define what cells should be on and off for numbers from 0-9 corresponding to their index in the array. 10 is "-" and 11 is " "
 * @type Array<Array<boolean>, 7>
 */
const displayNumbers = [
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
        classifier: for (let i = 0; i < 7; i++) {
            const segment = display.appendChild(document.createElement("div"));
            this.segments.push(segment);
            if(this.singular) continue classifier; // Labelled for loop, similar to a goto command. CSS takes care of the styling automatically, so we don't need the rest anymore.
            if(i===0 || i===3 || i===6) segment.classList.add("segmentx");
            if(i===1 || i===2 || i===4 || i===5) segment.classList.add("segmenty");
            if(i===2 || i===5) segment.classList.add("segmentr");
            if(i===3 || i===6) segment.classList.add("segmenth");
        }
        return display;
    },
    /** @type (number:number)=>void */
    update: function(number){
        this.segments.forEach(function(segment, index){
            if(!displayNumbers[number>=0 && number<=11?number: 0][index]) segment.style.opacity = "0.1";
            else segment.style.opacity = "1";
        });
    },
    /** @type (size: number, fat: boolean)=>void */
    resize: function(size, fat){

        document.querySelectorAll("div.segmentdisplay > div").forEach(function(element){
            element.style.borderWidth = fat + "px";
        });
        document.querySelectorAll("div.segmentdisplay > div.segmentx").forEach(function(element){
            element.style.marginLeft = fat + "px";
            element.style.width = size + "px";
        });

        document.querySelectorAll("div.segmentdisplay > div.segmenty").forEach(function(element){
            element.style.height = size + "px";
        });
        document.querySelectorAll("div.segmentdisplay > div.segmentr").forEach(function(element){
            element.style.marginLeft = size + fat*2 + "px";
            element.style.marginTop = -(size + fat*2) + "px";
            element.style.marginBottom = fat + "px";
        });
    }
}

function MultiDigitDisplayBuilder(digits, number, singleSided){
    this.displays = [];
    this.digits = digits
    for (let i = 0; i < this.digits; i++) {
        this.displays.push(new DisplayBuilder(number, i, singleSided));
    }    
}

MultiDigitDisplayBuilder.prototype = {
    build: function(target){
        this.displays.forEach(function(display){
            target.appendChild(display.build());
        });
    },
    update: function(number){
        const max = "9".repeat(this.digits);
        this.displays.forEach(function(display, index){
            display.update(max > number ? tokenizeNumber(number)[index] : 9);
        });
    }
}