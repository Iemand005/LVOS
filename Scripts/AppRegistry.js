/* AppRegistry - Lightweight app registry for LVOS Mobile.
   Provides app registration, iteration, and persistence
   without the full WindowManager/Dialog desktop scaffolding.

   Save and load are intentionally separate from adding:
	 addApp(app)  - adds to registry only, no localStorage
	 saveApp(app) - persists one app to localStorage only
	 loadApps()   - loads from localStorage into registry only
*/

var canSave = true;
var hasLocalStorage = false;

try {
	hasLocalStorage = typeof localStorage !== "undefined";
} catch (ex) {
	hasLocalStorage = false;
}

if (!hasLocalStorage) canSave = false;

/**
 * @param {any} object
 * @returns {object is HTMLElement}
 */
function isElement(object) {
	return object && "nodeType" in object;
}

/** @param {string} url */
function getFaviconUrl(url) {
	var m = url.match(/^([a-z]+:\/\/[^\/]+)/i);
	return (m ? m[1] : url) + "/favicon.ico";
}

/** @param {string} url */
function getDomain(url) {
	return url.replace(/^[a-z]+:\/\//i, "").split("/")[0].split("?")[0];
}

/** @param {string} url */
function getSiteName(url) {
	var domain = url.replace(/^[a-z]+:\/\//i, "").split("/")[0].split("?")[0];
	var parts = domain.split(".");
	var name = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
	return name.charAt(0).toUpperCase() + name.slice(1);
}

/** @param {*} exception */
function handleStorageException(exception) {
	console.error(exception);
	console.warn("A problem occurred, app state saving has been disabled for this session.");
	canSave = false;
}

function AppRegistry() {
	/** @type {{[id:string]: Application}} */
	this._apps = {};
}

/* --- Registry (no persistence) --- */

/** @param {Application} app */
AppRegistry.prototype.addApp = function(app) {
	if (!app || typeof app !== "object") return;
	if (!app.id) app.id = app.title || "unknown";
	this._apps[app.id] = app;
};

AppRegistry.prototype.addApps = function() {
	for (var i = 0; i < arguments.length; i++) {
		var arr = arguments[i];
		if (arr instanceof Array)
			for (var j = 0; j < arr.length; j++)
				this.addApp(arr[j]);
	}
};
/** @param {string} id */
AppRegistry.prototype.getApp = function(id) {
	if (!id) return null;
	return this._apps[id] || null;
};

/** @param {string} id */
AppRegistry.prototype.removeApp = function(id) {
	if (!id) return;
	delete this._apps[id];
};
/** @param {(app: Application, id: string)=>void} callback */
AppRegistry.prototype.forEachApp = function(callback) {
	if (typeof callback !== "function") return;
	for (var id in this._apps)
		if (this._apps.hasOwnProperty(id))
			callback(this._apps[id], id);
};

Object.defineProperty(AppRegistry.prototype, "apps", {
	get: function() { return this._apps; }
});

/* --- Persistence (localStorage) --- */

Object.defineProperty(AppRegistry.prototype, "installedApps", {
	get: function() {
		if (!hasLocalStorage) return [];
		try {
			var string = localStorage.getItem("installedApps");
			if (string === null) return [];
			var apps = JSON.parse(string);
			return apps instanceof Array ? apps : [];
		} catch (exception) {
			if (exception instanceof Error) console.error(exception.message);
			return [];
		}
	}
});
/** @param {Application} app */
AppRegistry.prototype.saveApp = function(app) {
	if (!canSave || !hasLocalStorage) return;
	if (!app || typeof app !== "object" || !app.id) return;
	try {
		var apps = this.installedApps;
		for (var i = 0; i < apps.length; i++) {
			if (apps[i].id === app.id) return;
		}
		apps.push(app);
		localStorage.setItem("installedApps", JSON.stringify(apps));
	} catch (exception) {
		handleStorageException(exception);
	}
};

AppRegistry.prototype.loadApps = function() {
	if (!canSave || !hasLocalStorage) return;
	var self = this;
	try {
		var apps = this.installedApps;
		for (var i = 0; i < apps.length; i++) {
			var app = apps[i];
			if (app && app.src) self.addApp(app);
		}
	} catch (exception) {
		handleStorageException(exception);
	}
};

/**
 * @param {string} url
 * @param {string} title
 * @param {string} id
 * @param {string} [iconUrl]
 */
AppRegistry.prototype.createApp = function(url, title, id, iconUrl) {
	/** @type {Application} */
	var app = {
		src: url,
		id: id || "custom." + getDomain(url),
		title: title || getSiteName(url)
	};
	if (iconUrl) app.iconUrl = iconUrl;
	return app;
};

AppRegistry.prototype.setWallpaper = function(id) {
	var wallpaperFrame = document.getElementById("wallpaper-frame");
	if (!(wallpaperFrame instanceof HTMLIFrameElement)) return;

	var app = this.getApp(id);
	if (!app) return;

	wallpaperFrame.src = app.src;
}

var appRegistry = new AppRegistry;
window.appRegistry = appRegistry;

// module.exports = {appRegistry};