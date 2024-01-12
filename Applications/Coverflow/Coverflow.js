//  Cover flow
// Lasse Lauwerys © 2024

'use strict';
'use esnext';
'use moz';

const oneDiv = document.querySelector("div");
const allDivs = document.querySelectorAll("div");

function fixZIndex(){
    const rightHandDivs = document.querySelectorAll("div#active~div");
    allDivs.forEach(function(elmeent, index){
        elmeent.style.zIndex = 0;
    });
    rightHandDivs.forEach(function(elmeent, index){
        elmeent.style.zIndex = -1-index;
    });
}

fixZIndex();

let neededWidth = 0;
allDivs.forEach(function(element){
    fixZIndex();
    neededWidth += element.offsetWidth;
    element.addEventListener("click", function(event){
        
        activateElement(event.target);
        flow.scroll(event.target.offsetLeft + event.target.offsetWidth/2 - window.innerWidth/2, 0)
    });
});

const section = document.querySelector("section");

if (section) {
    document.querySelector("section").style.width = neededWidth;
    flow.getElementsByTagName("section")[0].style.width = neededWidth + "px";
}

function activateElement(element){

    document.getElementById("active").removeAttribute("id");
    element.id = "active";
    fixZIndex();

}

function scroll(ev){
    const eyea = document.elementFromPoint(window.innerWidth/2, window.innerHeight/2);
    console.log("ratte")
    if(eyea.tagName == "DIV") activateElement(eyea);
}

const flow = document.getElementsByClassName("coverflow")[0];
document.querySelector(".coverflow").onscroll = scroll
flow.onscroll = scroll;
window.onscroll = scroll;
window.onscroll = scroll;