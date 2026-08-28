
function Launchpad() {
	/** @type {HTMLElement | null} */
	this.launchpad = null;
	this.list = document.createElement("ul");
	this._isMobile = true;
}

function MobileFrameManager() {
	/** @type {{[id: string]: HTMLIFrameElement}} */
	this._frames = {};
	/** @type {string?} */
	this._activeId = null;
	/** @type {HTMLElement?} */
	this._container = null;
}
/** @param {HTMLElement} container */
MobileFrameManager.prototype.init = function(container) {
	this._container = container;
};

/** @param {Application} app */
MobileFrameManager.prototype.open = function(app) {
	if (!app.id || !app.src || !this._container) return;

	if (this._frames[app.id]) {
		this._showFrame(app.id);
		return;
	}

	var frame = document.createElement("iframe");
	frame.setAttribute("frameborder", "0");
	frame.src = app.src;
	this._frames[app.id] = frame;
	this._container.appendChild(frame);
	this._showFrame(app.id);
};

/** @param {string} id */
MobileFrameManager.prototype._showFrame = function(id) {
	if (!this._container) return;
	var keys = Object.keys(this._frames);
	for (var i = 0; i < keys.length; i++) {
		var key = keys[i];
		this._frames[key].style.display = key === id ? "block" : "none";
	}
	this._activeId = id;
	this._container.classList.add("open");
};

MobileFrameManager.prototype.hide = function() {
	if (!this._container) return;
	this._container.classList.remove("open");
};

MobileFrameManager.prototype.goBack = function() {
	if (!this._activeId) return false;
	var frame = this._frames[this._activeId];
	if (frame && frame.contentWindow) {
		frame.contentWindow.history.back();
		return true;
	}
	return false;
};

MobileFrameManager.prototype.getActiveFrame = function() {
	if (!this._activeId) return null;
	return this._frames[this._activeId] || null;
};

MobileFrameManager.prototype.getActiveId = function() {
	return this._activeId;
};

var mobileFrameManager = new MobileFrameManager;
window.mobileFrameManager = mobileFrameManager;

/** @param {HTMLElement} launchpad */
Launchpad.prototype.init = function(launchpad) {
	var closeButton = document.createElement("button");
	var self = this;
	closeButton.onclick = function() { self.close(); };
	closeButton.textContent = "Close";
	launchpad.appendChild(closeButton);

	launchpad.appendChild(this.list);
	this.launchpad = launchpad;

	var container = document.getElementById("main-frame");
	if (container) mobileFrameManager.init(container);
};

Launchpad.prototype.open = function() {
	if (!this.launchpad) return;
	this.launchpad.classList.add("open");
};

Launchpad.prototype.close = function() {
	if (!this.launchpad) return;
	this.launchpad.classList.remove("open");
};

/** @param {Application} app */
Launchpad.prototype._createMobileButton = function(app) {
	var title = (app && app.title) || "?";
	var openButton = document.createElement("button");
	openButton.appendChild(document.createTextNode(title.charAt(0).toUpperCase()));

	if (app && app.accentColor) openButton.style.background = app.accentColor;

	var iconUrl = app && app.iconUrl;
	if (iconUrl) {
		var icon = document.createElement("img");
		icon.onload = function() {
			openButton.textContent = "";
			openButton.appendChild(icon);
		};
		icon.src = iconUrl;
	}

	return openButton;
};

/** @param {Dialog | Application} app */
Launchpad.prototype.addApp = function(app) {
	var appElement = document.createElement("li");

	/**@type {isMobile is Dialog} */
	var isMobile = this._isMobile
	if (this._isMobile) {
		var openButton = this._createMobileButton(app);
		appElement.appendChild(openButton);

		openButton.onclick = function() {
			mobileFrameManager.open(app);
		};

		var appLabel = document.createElement("label");
		appLabel.textContent = (app && app.title) || "Unknown";
		appElement.appendChild(appLabel);
	} else {
		var openButton = app.createOpenButton();
		appElement.appendChild(openButton);
	}

	this.list.appendChild(appElement);
};

Object.defineProperty(Launchpad.prototype, "isMobile", {
	get: function() { return this._isMobile; },
	set: function(value) { this._isMobile = value; }
});
