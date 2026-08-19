
function Launchpad() {
	/** @type {HTMLElement?} */
	this.launchpad = null;
	this.list = document.createElement("ul");
	this._isMobile = true;
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
	var openButton = app.createOpenButton();

	if (this._isMobile) openButton.onclick = function() {
		// app.launch();
		var mainFrame = document.getElementById("main-frame");
		if (!(mainFrame instanceof HTMLIFrameElement)) return;
		if (app.src)
			mainFrame.src = app.src;
		mainFrame.classList.add("open");
	};
	appElement.appendChild(openButton);
	this.list.appendChild(appElement);
};
