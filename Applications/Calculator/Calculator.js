
'use strict';
'use esnext';
/*const*/var body = document.querySelector("body");
/*for (/*let*/var index = 0; index < 0; index++) {
    /*const*/var button = document.createElement("button");
    button.id = index;
    body.appendChild(button);
}*/
/*const*/var buttons = document.getElementsByTagName("input");
/*const*/var output = document.querySelector("output");
/*const*/var inputs = [];

document.querySelector("form").onsubmit = function(event){
    event.preventDefault();
    /*let*/var result = 0;
    for (/*let*/var key in inputs) {
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

/*for (/*let*/var button in buttons) {
    buttons[button].addEventListener("click", function(event){
        /*const*/var number = event.target.id;
        output.innerText += number;
    });
}*/