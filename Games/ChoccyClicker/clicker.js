
var button = document.getElementById("button");

function Clicker() {
	this.clicks = 0;
}

var clicker = new Clicker();

if (button) button.onclick = function() {
	clicker.clicks++;
};