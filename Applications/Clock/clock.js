// Clock tests for Minesweeper
// Copyright Lasse Lauwerys © 2023
// 9/1/2024

const displayBuilder = new DisplayBuilder();
const akka = displayBuilder.build();
document.body.appendChild(akka);

document.getElementById("size").onchange = function(){
    akka.querySelectorAll("div.segmentx").forEach(function(element){
        //element.style.backgroundColor = "orange";
        //element.style.borderColor = "orange";
        element.style.borderBottomColor = "orange";
    });
    akka.querySelectorAll("div.segmentx:after").forEach(function(element){
        element.style.borderTopColor = "red";
        element.style.opacity = "0.3";
    });
    akka.querySelectorAll("div.segmentdisplay>div").forEach(function(element){
        element.style.borderColor = "red";
    });
}