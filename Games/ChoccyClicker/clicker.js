
var button = document.getElementById("button");
var clickCount = document.getElementById("click-count");


function Clicker() {
	var clicks = 0;
	try {
		var clickStr = localStorage.getItem("clicker_clicks");
		if (clickStr) clicks = parseInt(clickStr);
	} catch(ex) {
		console.log("error storage", ex);
	}
	this.clicks = 0;
}

Clicker.prototype.click = function() {
	this.clicks++;
	localStorage.setItem("clicker_clicks", this.clicks.toString());
}

var clicker = new Clicker();

var textNode = document.createTextNode("0");

if (clickCount) clickCount.appendChild(textNode);
if (button) button.onclick = function() {
	clicker.clicks++;
	textNode.data = clicker.clicks.toString();
};