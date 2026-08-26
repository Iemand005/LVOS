'use strict';

/** @param {HTMLInputElement} output */
function Calculator(output) {
    this.expression = "";
    this.output = output;
}

Calculator.prototype.updateDisplay = function() {
    this.output.value = this.expression || "0";
};

Calculator.prototype.calculate = function () {
    var safeExpr = this.expression.replace(/[^0-9+\-*/.]/g, "");

    if (!safeExpr) {
        this.expression = "0";
        this.updateDisplay();
        return;
    }

    try {
        this.expression = String(eval(safeExpr));
    } catch (e) {
        this.expression = "Error";
    }

    this.updateDisplay();
};

Calculator.prototype.clearAll = function () {
    this.expression = "";
    this.updateDisplay();
};

/** @param {string} value */
Calculator.prototype.press = function (value) {
    if (value === "=")
       return this.calculate();

    if (value === "C")
        return this.clearAll();

    if (this.expression === "Error")
        this.expression = "";

    this.expression += value;
    this.updateDisplay();
};

/** @type {Calculator | null} */
var calculator = null;

/**
 * @param {HTMLElement | null} element
 * @returns {element is HTMLInputElement}
 */
function hasValueProperty(element) {
    return !!element && "value" in element;
}

function load() {
    var output = document.getElementById("display");
    var cells = document.getElementsByTagName("button");

    if (!hasValueProperty(output)) return;
    calculator = new Calculator(output);

    for (var i = 0; i < cells.length; i++) {
        cells[i].onclick = function () {
            if (!calculator) return;
            calculator.press(this.textContent || this.innerText);
        };
    }

    calculator.updateDisplay();
}

window.addEventListener("load", load, false);

LVMessenger.receive(function(message, data) {
    if (message === "theme")
        document.body.className = data.className;
});