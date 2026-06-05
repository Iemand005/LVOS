'use strict';

var output = document.querySelector("input");
var cells = document.getElementsByTagName("td");

function Calculator() {
    this.expression = "";
}

Calculator.prototype.updateDisplay = function() {
    output.value = expression || "0";
}

Calculator.prototype.calculate = function () {
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

Calculator.prototype.clearAll = function () {
    expression = "";
    updateDisplay();
}

Calculator.prototype.press = function (value) {
    if (value === "=") 
       return calculate();

    if (value === "C") 
        return clearAll();

    if (expression === "Error") {
        expression = "";
    }

    expression += value;
    updateDisplay();
}

for (var i = 0; i < cells.length; i++) {
    cells[i].onclick = function () {
        var value = this.textContent || this.innerText;
        press(value);
    };
}

updateDisplay();