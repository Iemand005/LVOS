
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
