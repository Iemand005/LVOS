
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
	this.clicks = clicks;

	this.textNode = document.createTextNode(clicks.toString());
}

Clicker.prototype.click = function() {
	if (this.clicks)
		this.clicks++;
	else this.clicks = 1;
	localStorage.setItem("clicker_clicks", this.clicks.toString());
	this.textNode.data = clicker.clicks.toString();
}

var clicker = new Clicker();

if (clickCount) clickCount.appendChild(clicker.textNode);
if (button) button.onclick = clicker.click, button.oncontextmenu = function(ev) { ev.preventDefault(); clicker.click() };