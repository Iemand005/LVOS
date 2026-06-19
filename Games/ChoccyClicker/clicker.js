
var button = document.getElementById("button");
var clickCount = document.getElementById("click-count");


function Clicker() {
	this.clicks = 0;
}

var clicker = new Clicker();

var textNode = document.createTextNode("0");

if (clickCount) clickCount.appendChild(textNode);
if (button) button.onclick = function() {
	clicker.clicks++;
};