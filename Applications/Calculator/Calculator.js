'use strict';

var output = document.querySelector("input");
var cells = document.getElementsByTagName("td");

var expression = "";

function updateDisplay() {
    output.value = expression || "0";
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

/* click handling for <td> */
for (var i = 0; i < cells.length; i++) {
    cells[i].onclick = function () {
        var value = this.textContent || this.innerText;
        press(value);
    };
}

updateDisplay();