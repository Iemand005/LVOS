

// var launchpad = new Launchpad("", "",)

function Launchpad() {
	this.launchpad = document.getElementById("launchpad");
	this.list = document.createElement("ul");
}
/**
 * @param {Application} app 
 */
Launchpad.prototype.addApp = function(app) {
	var appElement = document.createElement("li");
	this.list.appendChild(appElement);
};

var launchpad = new Launchpad();

window.windows.forEach(/** @type {Dialog} */dialog => {
	dialog
});