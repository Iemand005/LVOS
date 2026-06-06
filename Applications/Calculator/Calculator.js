'use strict';

function Calculator() {
    this.expression = "";
}

Calculator.prototype.updateDisplay = function() {
    output.value = this.expression || "0";
}

Calculator.prototype.calculate = function () {
    var safeExpr = this.expression.replace(/[^0-9+\-*/.]/g, "");

    if (!safeExpr) {
        expression = "0";
        this.updateDisplay();
        return;
    }

    try {
        this.expression = String(eval(safeExpr));
    } catch (e) {
        this.expression = "Error";
    }

    this.updateDisplay();
}

Calculator.prototype.clearAll = function () {
    this.expression = "";
    this.updateDisplay();
}

Calculator.prototype.press = function (value) {
    if (value === "=") 
       return this.calculate();

    if (value === "C") 
        return this.clearAll();

    if (this.expression === "Error")
        this.expression = "";

    this.expression += value;
    this.updateDisplay();
}

var output = document.getElementById("display");
var cells = document.getElementsByTagName("td");

/** @type {Calculator?} */
var calculator = null;

window.addEventListener("load", function () {
    calculator = new Calculator;

    for (var i = 0; i < cells.length; i++) {
        cells[i].onclick = function () {
            calculator.press(this.textContent || this.innerText);
        };
    }

    calculator.updateDisplay();
}, false);

