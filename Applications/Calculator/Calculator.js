
'use strict';
'use esnext';
/*const*/var body = document.querySelector("body");
/*for (var index = 0; index < 0; index++) {
    /var button = document.createElement("button");
    button.id = index;
    body.appendChild(button);
}*/
/*const*/var buttons = document.getElementsByTagName("input");
/*const*/var output = document.querySelector("output");
/*const*/var inputs = [];

document.querySelector("form").onsubmit = function(event){
    event.preventDefault();
    var result = 0;
    for (var key in inputs) {
        result += inputs[key];
    }
    display()
}


for (/*let*/var i = 0; i < 10; i++) {
    // document.getElementById(i).onclick = function(event){
    //     ///*const*/var number = event.target.id;
    //     inputs.push(i);
    //     display(inputs.join(""));
    // }
}

function display(message){
    //console.log(inputs.join(""))
    output.innerText = message;//inputs.join("");
}

/*for (var button in buttons) {
    buttons[button].addEventListener("click", function(event){
        var number = event.target.id;
        output.innerText += number;
    });
}*/