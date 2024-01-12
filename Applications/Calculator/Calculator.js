
'use strict';
'use esnext';
const body = document.querySelector("body");
/*for (let index = 0; index < 0; index++) {
    const button = document.createElement("button");
    button.id = index;
    body.appendChild(button);
}*/
const buttons = document.getElementsByTagName("input");
const output = document.querySelector("output");
const inputs = [];

document.querySelector("form").onsubmit = function(event){
    event.preventDefault();
    let result = 0;
    for (let key in inputs) {
        result += inputs[key];
    }
    display()
}


for (let i = 0; i < 10; i++) {
    document.getElementById(i).onclick = function(event){
        //const number = event.target.id;
        inputs.push(i);
        display(inputs.join(""));
    }
}

function display(message){
    //console.log(inputs.join(""))
    output.innerText = message;//inputs.join("");
}

/*for (let button in buttons) {
    buttons[button].addEventListener("click", function(event){
        const number = event.target.id;
        output.innerText += number;
    });
}*/