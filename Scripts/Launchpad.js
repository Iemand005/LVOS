
function Launchpad() {
	/** @type {HTMLElement?} */
	this.launchpad = null;
	this.list = document.createElement("ul");
}
/** @param {HTMLElement} launchpad */
Launchpad.prototype.init = function(launchpad) {
	this.launchpad = launchpad;
	this.launchpad.appendChild(this.list);
};

/**
 * @param {Dialog} app 
 */
Launchpad.prototype.addApp = function(app) {
	var appElement = document.createElement("li");
	// appElement.textContent = app.id;
	appElement.appendChild(app.createOpenButton());
	this.list.appendChild(appElement);
};

// Launchpad.prototype.removeApp = function()
