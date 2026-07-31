
function Launchpad() {
	/** @type {HTMLElement?} */
	this.launchpad = null;
	this.list = document.createElement("ul");
}
/** @param {HTMLElement} launchpad */
Launchpad.prototype.init = function(launchpad) {
	var closeButton = document.createElement("button");
	var self = this;
	closeButton.onclick = function() { self.close(); };
	closeButton.textContent = "Close";
	launchpad.appendChild(closeButton);

	launchpad.appendChild(this.list);
	this.launchpad = launchpad;
};

Launchpad.prototype.open = function() {
	if (!this.launchpad) return;
	this.launchpad.classList.add("open");
}

Launchpad.prototype.close = function() {
	if (!this.launchpad) return;
	this.launchpad.classList.remove("open");
}

/**
 * @param {Dialog} app 
 */
Launchpad.prototype.addApp = function(app) {
	var appElement = document.createElement("li");
	// appElement.textContent = app.id;
	appElement.appendChild(app.createOpenButton());
	this.list.appendChild(appElement);
};
