
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
};

Launchpad.prototype.close = function() {
	if (!this.launchpad) return;
	this.launchpad.classList.remove("open");
};

/**
 * @param {Dialog} app 
 */
Launchpad.prototype.addApp = function(app) {
	var appElement = document.createElement("li");
	// appElement.textContent = app.id;
	var openButton = app.createOpenButton();

	appElement.appendChild(openButton);


	if (this._isMobile) {
		openButton.textContent = openButton.textContent.charAt(0).toUpperCase();
		if (app.application && app.application.accentColor) openButton.style.background = app.application.accentColor;
		openButton.onclick = function() {
			var appFrame = document.getElementById("app-frame");
			var mainFrame = document.getElementById("main-frame");
			if (!(mainFrame instanceof HTMLElement) || !(appFrame instanceof HTMLIFrameElement)) return;
			if (app.src && appFrame.src !== app.src)
				appFrame.src = app.src;
			mainFrame.classList.add("open");
		};

		var iconUrl = app.iconUrl;
		if (iconUrl) {
			var icon = document.createElement("img");
			icon.onload = function() {
				openButton.textContent = "";
				openButton.appendChild(icon);
			};
			icon.src = iconUrl;
		}

		var appLabel = document.createElement("label");
		appLabel.textContent = app.title || "Unknown";

		appElement.appendChild(appLabel);
	}
	this.list.appendChild(appElement);
};

Object.defineProperty(Launchpad.prototype, "isMobile", {
	get: function() { return this._isMobile; },
	set: function(value) { this._isMobile = value; }
});