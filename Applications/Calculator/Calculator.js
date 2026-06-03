
'use strict';
var output = document.querySelector("output");
var buttons = document.querySelectorAll("input[type='button']");
var expression = "";

function updateDisplay() {
    output.textContent = expression || "0";
}

function calculate() {
    var safeExpr = expression.replace(/[^0-9+\-*/.]/g, "");
    if (!safeExpr) {
        expression = "0";
        updateDisplay();
        return;
    }
    try {
        expression = String(eval(safeExpr));
    } catch (e) {
        expression = "Error";
    }
    updateDisplay();
}

function clearAll() {
    expression = "";
    updateDisplay();
}

function press(value) {
    if (value === "=") {
        calculate();
        return;
    }
    if (value === "C") {
        clearAll();
        return;
    }
    if (expression === "Error") {
        expression = "";
    }
    expression += value;
    updateDisplay();
}

document.querySelector("form").addEventListener("submit", function (event) {
    event.preventDefault();
    calculate();
});

for (var i = 0; i < buttons.length; i += 1) {
    buttons[i].addEventListener("click", function (event) {
        press(event.target.value);
    });
}

updateDisplay();