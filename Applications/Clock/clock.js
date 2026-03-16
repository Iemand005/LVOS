// Clock tests for Minesweeper
// Copyright Lasse Lauwerys © 2023
// 9/1/2024

'use strict';
'use esnext';
/*const*/var displayBuilder = new DisplayBuilder();
/*const*/var akka = displayBuilder.build();
document.body.appendChild(akka);

document.getElementById("size").onchange = function () {
    akka.querySelectorAll("div.segmentdisplay>div").forEach(function (element) {
        element.style.borderColor = "red";
    });
};