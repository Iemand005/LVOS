/*\
   \________
   / ______/\                                               \\
  / /     /\ \    LWM (Lasse's Window Manager)               \\
 /_/_____/  \ \   Targeting: ES5 (with custom ES6 extensions) \\
 \ \     \  / /   Copyright: Lasse Lauwerys © 2023 - 2026     //
  \ \_____\/ /    Created: 17/12/2023                        //
   \_______\/                                               //
   /
\*/

"use strict";

// Modifiable settings
var useTransform = true,
	useScale = false;

// HTA can expose PointerEvent without behaving correctly for drag/resize, so prefer the old IE pointer flags.
var supportsPointer = typeof window !== "undefined" && ("PointerEvent" in window || "MSPointerEvent" in window);
var supportsObjectFit = Boolean(document.documentElement && document.documentElement.style && typeof document.documentElement.style.objectFit !== "undefined");
var supportsTransitions = false;
var supportsTransform = false;

var isBlink = "chrome" in window;
var isIE = typeof window !== "undefined" && typeof document !== "undefined" && !!window.MSInputMethodContext && document.documentMode === 11;

(function () {
	var style = document.createElement("div").style;

	supportsTransitions = (
		"transition" in style ||
		"WebkitTransition" in style ||
		"MozTransition" in style ||
		"OTransition" in style ||
		"msTransition" in style
	);
	supportsTransform = (
		"transform" in style ||
		"webkitTransform" in style ||
		"msTransform" in style ||
		"mozTransform" in style ||
		"OTransform" in style
	);
})();
if (supportsPointer) console.log("Supports pointer events!");


/** @type {"webkitTransitionEnd" | "transitionend"} */
var transitionEndEvent = ("webkitTransition" in document.documentElement.style) ? "webkitTransitionEnd" : "transitionend";


if (isIE) useTransform = true;

if (!supportsTransform) useTransform = false;

var flags = {
	useSkewAnimations: false,
	aeroSnap: false,
	updateRateLimit: isBlink,
	useDragOverlay: true,
	_useTransform: useTransform,
	get useTransform() { return this._useTransform; },
	set useTransform(value) {
		this._useTransform = value;
		windowManager.forEachWindow(function(dialog) { dialog.useTransform = value; });
	},
	_compositorResize: true,
	get compositorResize() { return this._compositorResize; },
	set compositorResize(value) {

		document.body.classList.toggle("compositor-animations", !!value);
		if (value) this._useViewTransitionMaximize = false;
		this._compositorResize = value;
	},
	_useViewTransitionMaximize: false,
	get useViewTransitionMaximize() { return this._useViewTransitionMaximize; },
	set useViewTransitionMaximize(value) {

		if (value) this.compositorResize = false;
		this._useViewTransitionMaximize = value;
	},
	_useMica: false,
	get useMica() { return this._useMica; },
	set useMica(value) {
		window.windowManager.toggleMica(value);
		this._useMica = value;
	},
	windowReaper: false,
	verboseLogs: false
};

//#region Functions

/** @param {Event} event */
function cancelDomEvent(event) {
	if (typeof event.preventDefault === "function") event.preventDefault();
	event.returnValue = false;
	if (typeof event.stopPropagation === "function") event.stopPropagation();
	event.cancelBubble = true;
	return false;
}

/** @param {string} url */
function getFaviconUrl(url) { return "https://" + getDomain(url) + "/favicon.ico"; }

/** @param {string} url */
function getDomain(url) {
	return url.replace(/^[a-z]+:\/\/+/i, "").split("/")[0].split("?")[0];
}

/** @param {string} url */
function getSiteName(url) {
	var parts = getDomain(url).split(".");
	var name = parts.length >= 2 ? parts[parts.length - 2] : parts[0];

	return name.charAt(0).toUpperCase() + name.slice(1);
}


/** @param {Element} element */
function isDialog(element) {
	return element && element.classList && element.classList.contains("window");
}

/**
 * @param {Node} object
 * @returns {object is HTMLElement}
 */
function isElement(object) { return object && "nodeType" in object; }


/** @param {Window} window */
function getWindowChromeHeight(window) {
	return window.outerHeight - window.innerHeight;
}

/**
 * @param {HTMLElement} element
 * @param {number} x
 * @param {number} y
 * @param {number} [skew]
 * @param {number} [scaleX]
 * @param {number} [scaleY]
 * @param {number} [rotation]
 */
function translateElement(element, x, y, skew, scaleX, scaleY, rotation) {
	var transform = "translate(" + Math.floor(x) + "px," + Math.floor(y) + "px)";
	if (skew) transform += " skewX(" + skew + "deg)";
	if (scaleX === 1) scaleX = undefined;
	if (scaleY === 1) scaleY = undefined;
	if (scaleX && scaleY) transform += "scale(" + scaleX + "," + scaleY + ")";
	else {
		if (scaleX) transform += "scaleX(" + scaleX + ")";
		if (scaleY) transform += "scaleY(" + scaleY + ")";
	}
	if (rotation) transform += "rotate(" + rotation + "deg)";

	else {
		element.style.transform = transform;
	}
}

/**
 * @param {HTMLElement} element
 * @param {number} skew
 */
function skewElement(element, skew) {
	var transform = " skewX(" + toDegrees(skew) + ")";
	element.style.transform = transform;
	element.style.webkitTransform = transform;
}

/**
 * @param {HTMLElement} element
 * @param {string} className
 * @param {boolean} [enabled]
 */
function setClass(element, className, enabled) {
	var re = new RegExp("(^|\\s)" + className + "(\\s|$)");

	if (typeof enabled === "undefined") enabled = element.className.indexOf(className) === -1;

	if (enabled) {
		if (!re.test(element.className))
			element.className = (element.className + " " + className).replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
	} else element.className = element.className.replace(re, " ").replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
	return element.className.indexOf(className) !== -1;
}

/**
 * @param {HTMLElement| null} element
 * @param {number} [index]
 */
function getRect(element, index) {
	if (!element) return null;
	return index ? element.getClientRects()[index] : element.getBoundingClientRect();
}

/**
 * @param {MessageType} type
 * @param {any} data
 * @param {string} [source]
 */
function messageReceived(type, data, source){

	if (source) {

		var dialog = windowManager.windows[source];

		if (type === "windowSize") dialog.resizeBody(data.width, data.height); // Client dictates its size; window wraps around the client area.
		switch (type) {
			case "launchOverlay":
				var overlay = bodyCrawler.getOverlay();
				if (!overlay) break;

				overlay.ontransitionend = function () {
					dialog.messageFrame("prepareToLaunchOverlay");
					if (dialog.frame) {
						var oriel = new URL(dialog.frame.src);
						oriel.searchParams.set("fullscreen", String(true));
						dialog.frame.src = oriel.href;
					}
					if (!overlay) return;
					overlay.ontransitionend = null;
					overlay.requestFullscreen().then(function() {
						console.log("Ok I did full screen boy");
					});
					if (dialog.body) overlay.appendChild(dialog.body);
					window.setTimeout(overlay.classList.add.bind(overlay.classList, "shown"), 500);
				};
				overlay.classList.toggle("open");
				break;
			case "readyToLaunchOverlay":
				var overlay1 = bodyCrawler.getOverlay();
				if (!overlay1) break;
				if (dialog.body) overlay1.appendChild(dialog.body);
				window.setTimeout(overlay1.classList.add.bind(overlay1.classList, "shown"), 500);
				break;
			case "pip":
				var id = data.id;
				console.log("Element ID to rip from app guts: " + id, dialog);
				var doc = dialog.contentDocument;
				if (!doc) break;
				var targetElement = doc.getElementById(id);
				console.log("Ripped out element:", targetElement);
				if (!targetElement) break;
				DesktopManager.toggleElementPip(targetElement, function (pipWindow) {
					if (!pipWindow) return;
					pipWindow.onresize = function() {
						if (!(targetElement instanceof HTMLCanvasElement)) return;
						targetElement.width = targetElement.clientWidth;
						targetElement.height = targetElement.clientHeight;
					};
					if (!targetElement) return;
					targetElement.style.width = "100%";
					targetElement.style.height = "100%";
				});
				break;
			case "visualizers":
				dialog.messageFrame("visualizers", window.windowManager.getVisualizerApps());
				break;
		}
		console.log("Received message " + type);
	}
}

function swapMetroBody() {
	if (!windowManager.flipped) return;
	windowManager.activeDialogToMetro();
}

/** @param {boolean} enable */
function flip(enable){
	var tesktop = bodyCrawler.getDesktop();
	if (!tesktop) return;
	tesktop.toggleAttribute("flipped", enable); // Deprecated; moving to a class attribute.
	flipHandler(tesktop.classList.toggle("flipped", enable));
}

/** @param {boolean} enable */
function flipHandler(enable){
	DesktopManager.toggleCharms(false);
	swapMetroBody();
	windowManager.flipped = enable;
	return windowManager.flipped;
}

/** @param {boolean} [enable] */
function toggleOverlay(enable) {
	var overlay = bodyCrawler.getOverlay();
	if (!overlay) return;
	overlay.classList.toggle("open", enable);
}


var windowButtons = {
	eject: 0,
	full: 1,
	close: 2
};


/** @param {WindowProperties} properties */
function stringifyDialogProperties(properties){
	return JSON ? JSON.stringify(properties).replace(/true/g, "yes").replace(/false/g, "no").replace(/:/g, "=").replace(/[}{"]/g, "") : "No JSON!";
}

function getViewBoxPosition() {
	return { x: window.screenLeft, y: window.screenTop };
}

/** @param {number} value */
function toPixels(value) {
	return Math.round(value) + "px";
}

/** @param {number} value */
function toDegrees(value) {
	return Math.round(value) + "deg";
}

/** @param {number} pixels */
function pixelsToCentimeters(pixels){
	return (pixels * 2.54 / 96) * (window.devicePixelRatio || 1);
}

/** @param {string} text */
function fromPixels(text){
	if (text !== null) try {
		return typeof text === "number" ? text : parseInt(text.replace("px", ""));
	} catch (ex) { console.warn("Failed to parse pixels:", ex); }
	return 0;
}

/** @param {*} exception */
function handleStorageException(exception){
	console.error(exception);
	console.warn("A problem occurred, window state saving has been disabled for this session! The stored window state will be reset in an attempt to recover from this issue.");
	console.log("If you wish to save the window state before reset, copy this and put it somewhere else:", localStorage.windowState);
	localStorage.windowState = null;
	windowManager.canSave = false;
}


function getDialogTemplate(){
	var template = document.querySelector("template") || document.getElementById("window-template");
	if (!template ) return void console.warn("Couldn't find template!");
	var content = template;
	if (template instanceof HTMLTemplateElement) return template.content.children[0];
	return content.children ? content.children[0] : content.getElementsByClassName("window")[0];//document.querySelector("template");
}

function createDialog() {
	var container = bodyCrawler.getDialogsContainer();
	var template = getDialogTemplate();
	if (!template) return null;
	var clone = template.cloneNode(true);
	if (container && clone instanceof Element) {
		/** @type {Element | WindowElement} */
		var dialogElement = container.appendChild(removeComments(clone));
		if (isElement(dialogElement)) return dialogElement;
	}
	return null;
}

/** @param {Element} element */
function removeComments(element){ // Removes the comments of an HTMLElement based object.
	element.childNodes.forEach(function (child) {
		if (child.nodeName === "#comment") element.removeChild(child);
		else if (isElement(child)) removeComments(child);
	});
	return element;
}

//#endregion

//#region Window Manager

function WindowManager() {
	/** @type {DialogMap} @readonly */
	this._windows = {};

	/** @type {DesktopState | null} */
	this._windowStates = null;

	this._isBlurEnabled = true;
	this._isMicaEnabled = false;
	this._isWindowUpdatesEnabled = false;

	this.isDragging = false;
	/** @readonly */
	this.dragAction = new DragAction;

	/** @type {Dialog | null} */
	this.activeDialog = null;
	this.topZ = 100;
	this.loaded = false;

	this.canSave = true;

	try {
		var hasLocalStorage = typeof localStorage !== "undefined";
		if (!hasLocalStorage) this.canSave  = false;
	} catch(ex) { console.warn("Local storage access denied.", ex); }

	this.ticking = false;

	this.flipped = false;


	/** @type {Dialog | null} */
	this.focusedDialog = null;


	var self = this;
	this.resizeHandler = function() {
		self.forEachWindow(function (window) { window.update(); });
	};

	/** @param {PointerEvent | MouseEvent} event */
	this.windowDragEvent = function(event) {
		try {
			// If the pointer button has already been released without a matching
			// pointerup reaching this document (e.g. it happened over an embedded
			// app iframe), stop dragging so the window lets go of the mouse.
			if (event && event.buttons === 0 && self.isDragging) {
				self.disableDialogDrag();
				return;
			}
			cancelDomEvent(event);
			if (flags.updateRateLimit) {
				if (self.ticking) return;
				window.requestAnimationFrame(function() {
					windowManager.handleWindowDrag(event.clientX, event.clientY);
					self.ticking = false;
				});
				self.ticking = true;
			} else windowManager.handleWindowDrag(event.clientX, event.clientY);
		} catch (ex) {
			console.error(ex);
		}
	};
}

Object.defineProperty(WindowManager.prototype, "windows", {
	get: function() { return this._windows; }
});

Object.defineProperty(WindowManager.prototype, "windowStates", {
  get: function () {
	if (!this._windowStates && localStorage)
	  try {
		var string = localStorage.getItem("windowState");
		if (string === null) return null;
		  this._windowStates = JSON.parse(string);
	  } catch (ex) {
		if (ex instanceof Error) console.error(ex.message);
	  }
	return this._windowStates;
  }
});

Object.defineProperty(WindowManager.prototype, "state", {
  get: function () {
	/** @type {DesktopState} */
	var state = {};
	for (var id in this.windows) if (this.windows[id]) state[id] = this.windows[id].getState();
	return state;
  }
});

Object.defineProperty(WindowManager.prototype, "isBlurEnabled", {
  get: function () { return this._isBlurEnabled; },
  set: function (value) {
	if (typeof value === "boolean") this._isBlurEnabled = value;
  }
});

Object.defineProperty(WindowManager.prototype, "isMicaEnabled", {
  get: function () {
	return this._isMicaEnabled;
  },
  set: function (value) {
	if (typeof value !== "boolean") return;
	document.body.classList.toggle("mica", value);
	windowManager.forEachWindow(function(window) { window.mica = value; });
	this._isMicaEnabled = value;
  }
});

Object.defineProperty(WindowManager.prototype, "isWindowUpdatesEnabled", {
	get: function() { return this._isWindowUpdatesEnabled; },
	set: function(value) {
		if (value) window.addEventListener("resize", this.resizeHandler, false);
		else window.removeEventListener("resize", this.resizeHandler, false);
		this._isWindowUpdatesEnabled = value;
	}
});

WindowManager.prototype.saveState = function() {
	if (!this.loaded) return;
	if (window.top !== window.self) return; // Every page that embeds this script shares the same "windowState" storage key. Only the top-level desktop may write to it, otherwise iframes like the mobile view overwrite the desktop's session on unload!
	if (flags.verboseLogs) console.log("Saving window state.");
	try {
		if (this.canSave && typeof localStorage !== "undefined")
			localStorage.setItem("windowState", JSON.stringify(this.state));
	} catch (exception) {
		handleStorageException(exception);
	}
};

/** @param {Dialog} [dialog] */
WindowManager.prototype.loadState = function(dialog) { // TOaddEventListenerDO: Load the state from localstorage on object creation, then keep that in memory for reading and add a func like this that takes one dialog as param and only restores for that
	console.log("Loading window state.");
	if (!this.canSave) {
		console.log("Storage access is disabled for this session!");
		return;
	}
	try {
		if (!localStorage) return;
		var windowStates = this.windowStates;
		if (!windowStates) {
			this.loaded = true;
			return;
		}
		this.loaded = true;
		if (dialog && dialog.id) {
			dialog.loadState(windowStates[dialog.id]);
			this.updateTopZ(dialog.z);
		} else {
			var fails = [];
			for (var id in windowStates) try {
				var window = this.windows[id];
				if (window && windowStates[id])
					window.loadState(windowStates[id]);
			} catch (ex) { fails.push(ex); }
			fails.forEach(function (fail) { console.error("Failed to load a window.", fail); });
			this.updateTopZ();
		}
	} catch (exception) {
		handleStorageException(exception);
	}
};


/** @param {WindowCallback} callback */
WindowManager.prototype.forEachWindow = function (callback) {
  for (var id in this.windows)
	if (this.windows.hasOwnProperty(id)) callback(this.windows[id], id);
};

WindowManager.prototype.killAll = function () {
	this.forEachWindow(function (dialog) { dialog.kill(); });
};

WindowManager.prototype.synchronizeStates = function () {
	this.forEachWindow(function(dialoge) { dialoge.reportState(); });
};

/** @param {Application | HTMLElement} app */
WindowManager.prototype.loadApp = function(app) {
	try {
		this._windows[app.id] = new Dialog(app);
		this._windows[app.id].mica = this.isMicaEnabled || false;
	} catch(ex) { console.warn("Appleload failed", ex); }
};
/**
 * @param {string} url
 * @param {string} [title]
 * @param {string} [id]
 * @param {string} [iconUrl]
 */
WindowManager.prototype.installApp = function (url, title, id, iconUrl) {
	/** @type {Application} */
	var application = {
		src: url,
		id: id || "custom." + getDomain(url),
		title: title || getSiteName(url)
	};
	if (iconUrl) application.iconUrl = iconUrl;
	this.loadApp(application);
	this.saveInstalledApp(application);
};

Object.defineProperty(WindowManager.prototype, "installedApps", {
	get: function() {
		if (typeof localStorage === "undefined") return [];
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

/** @param {Application} application */
WindowManager.prototype.saveInstalledApp = function(application) {
	if (!this.canSave || typeof localStorage === "undefined") return;
	try {
		var apps = this.installedApps;
		for (var i = 0; i < apps.length; i++)
			if (apps[i].id === application.id) return;
		apps.push(application);
		localStorage.setItem("installedApps", JSON.stringify(apps));
	} catch (exception) {
		handleStorageException(exception);
	}
};

WindowManager.prototype.loadInstalledApps = function() {
	if (!this.canSave || typeof localStorage === "undefined") return;
	try {
		this.installedApps.forEach(function(application) {
			if (application && application.src) this.loadApp(application);
		}, this);
	} catch (exception) {
		handleStorageException(exception);
	}
};
/**
 * @param {string} url
 * @param {string} [proxyUrl]
 */
WindowManager.prototype.installAppProxied = function (url, proxyUrl) {
	if (!proxyUrl) proxyUrl = "https://browz.netlify.app/browz-set-cookie/";
	this.installApp(proxyUrl + url, getSiteName(url), "custom." + getDomain(url), getFaviconUrl(url));
};

/** @param {boolean} enabled */
WindowManager.prototype.toggleDragging = function(enabled) {
	ClickOffset.toggleDragEventHandler(enabled, this.windowDragEvent, "grabbing");
	this.isDragging = enabled;
};

WindowManager.prototype.getVisualizerApps = function() {
	/** @type {Application[]} */
	var apps = [];
	this.forEachWindow(function (dialog) {
		if (dialog.application && dialog.application.audioVisualizer) apps.push(dialog.application);
	});
	return apps;
};

WindowManager.prototype.injectApplications = function() {
	for (var i = 0; i < arguments.length; i++)
		arguments[i].forEach(windowManager.loadApp, windowManager);
	windowManager.loadState();
};

/** @param {string} appId  */
WindowManager.prototype.closeApp = function(appId) {
	windowManager.windows[appId].kill();
};

/** @param {boolean} [enabled] */
WindowManager.prototype.toggleMica = function(enabled) {
	this.isMicaEnabled = typeof enabled === "undefined" ? enabled : !this.isMicaEnabled;
};

WindowManager.windowBoundsInset = { top: 0, left: -100, right: -100, bottom: -100 };

WindowManager._windowBounds = { top: 0, left: 0, right: 0, bottom: 0 };

WindowManager.recalculateWindowBounds = function() {
	var inset = WindowManager.windowBoundsInset;
	WindowManager._windowBounds.top = inset.top !== null ? inset.top : -Infinity;
	WindowManager._windowBounds.left = inset.left !== null ? inset.left : -Infinity;
	WindowManager._windowBounds.right = inset.right !== null ? window.innerWidth - inset.right : Infinity;
	WindowManager._windowBounds.bottom = inset.bottom !== null ? window.innerHeight - inset.bottom : Infinity;
};

window.addEventListener("resize", WindowManager.recalculateWindowBounds, false);
window.addEventListener("load", WindowManager.recalculateWindowBounds, false);

Object.defineProperty(WindowManager, "windowBounds", {
	get: function () { return WindowManager._windowBounds; }
});

WindowManager.getWindowBounds = function() {
	return WindowManager.windowBounds;
};
/** @param {Dialog} dialog */
WindowManager.prototype.focusDialog = function(dialog) {
	if (this.focusedDialog !== null && this.focusedDialog.target)
		this.focusedDialog.target.removeAttribute("focus");
	if (dialog.target) dialog.target.setAttribute("focus", String(true));
	this.focusedDialog = dialog;
};


WindowManager.prototype.activeDialogToMetro = function() { if (this.activeDialog) this.activeDialog.exportDialogBodyToMetro(); };

WindowManager.prototype.ininializeDialogs = function() {
	var self = this;
	var stop = function() { self.disableDialogDrag(); };
	var event = supportsPointer ? "pointerup" : "mouseup";
	document.addEventListener(event, stop, false);
	window.addEventListener(event, stop, false);

	this.dragAction.set(0);
	var dialogs = bodyCrawler.getAllDialogs();
	Array.from(dialogs).forEach(function (dialog) {
		if (isElement(dialog))
			self.loadApp(dialog);

	});
	this.loadState();
};

/**
 * Activates the window on which the provided event was fired.
 * @param {MouseEvent | PointerEvent} event
 * @param {Dialog} dialog
 */
WindowManager.prototype.windowActivationEvent = function(event, dialog) {
	// If the event originated from an interactive element, don't start a drag
	try {
		var node = event && (event.target || event.srcElement);
		var isInteractive = false;
		while (node && isElement(node) && node.nodeType === 1) {
			var tn = (node.tagName || "").toLowerCase();
			if (tn === "input" || tn === "textarea" || tn === "select" || tn === "button" || tn === "a" || tn === "label" || tn === "output") { isInteractive = true; break; }
			if (node.hasAttribute && node.hasAttribute("contenteditable")) { isInteractive = true; break; }
			node = node.parentElement;
		}
		if (isInteractive) {
			try { dialog.focus(); } catch (ex) { console.warn(ex); }
			return dialog;
		}
	} catch (ex) {  console.warn(ex);  }

	cancelDomEvent(event);

	if (supportsPointer && event && "pointerId" in event && event.target instanceof HTMLElement && typeof event.target.setPointerCapture === "function") {
		try { event.target.setPointerCapture(event.pointerId); } catch (ex) { console.warn(ex); }
	}
	if (flags.verboseLogs) console.log("Activating window", dialog);
	this.activeDialog = dialog;
	this.enableDialogDrag();
	// Default a window grab to a move; the sizer handler overrides this with a
	// resize direction right after, so a stuck resize can never hijack dragging.
	this.dragAction.set(0);
	dialog.setClickOffset(event.clientX, event.clientY);
	dialog.activate();
	return dialog;
};


/**
 * @param {number} newX
 * @param {number} hewY
 */
WindowManager.prototype.handleWindowDrag = function(newX, hewY) {
	var dialog = this.activeDialog;
	if (!dialog || !dialog.clickOffset) return;
	/** @type {Position} */
	var difference = { x: newX - dialog.clickOffset.clickX, y: hewY - dialog.clickOffset.clickY };

	if (dialog.maximized) {
		if (!flags.aeroSnap) return;
		dialog.maximized = false;
		dialog.clickOffset.clickX /= window.innerWidth / dialog.width;
	}

	dialog.stopAnimating();

	this.dragAction.execute(dialog, dialog.clickOffset, difference);
	if (dialog.moveEvents && dialog.exchangeDialogMoveEvent) dialog.exchangeDialogMoveEvent(difference);
};

WindowManager.prototype.disableDialogDrag = function() {
	if (!this.isDragging) return;
	// if (flipped) return;
	this.dragAction.set();
	this.toggleDragging(false);
	this.saveState();
	if (!this.activeDialog) return;

	if (flags.aeroSnap && this.activeDialog.y <= 0)
		this.activeDialog.maximize();

	if (!this.activeDialog.moveEvents) return;

	var func = this.activeDialog.exchangeDialogMouseUpEvent;
	if (func) func();
};

WindowManager.prototype.enableDialogDrag = function() {
	this.toggleDragging(true);
};

/** @param {number} [newZ]  */
WindowManager.prototype.updateTopZ = function(newZ) {
	if (typeof newZ === "number") {
		this.topZ = Math.max(this.topZ, newZ + 1);
		return;
	}
	var self = this;
	this.forEachWindow(function(dialog) {
		if (dialog && dialog.z >= self.topZ) self.topZ = dialog.z + 1;
	});
};

//#endregion

//#region ClickOffset

function ClickOffset() {
	this.clickX = 0;
	this.clickY = 0;
	this.height = 0;
	this.width = 0;
	this.startY = 0;
	this.startX = 0;
	this.start = new Vector;

	this.last = 0;
	this.start = 0;
	this.position = new Vector;
	this.lastPosition = new Vector;
	this.difference = new Vector;

	/** @type {((ev:PointerEvent|MouseEvent)=>void) | null} */
	this.dragHandler = null;
}

ClickOffset._overlay = document.createElement("div");
ClickOffset._overlay.className = "drag-overlay";
/** @param {MouseEvent} [ev] */
ClickOffset.disableOverlay = function (ev) {
	if (ev && ev.buttons) return;
	if (ClickOffset._overlay.remove) ClickOffset._overlay.remove();
	else if (ClickOffset._overlay.parentNode) ClickOffset._overlay.parentNode.removeChild(ClickOffset._overlay);
};
window.addEventListener("mousemove", ClickOffset.disableOverlay, false);
window.addEventListener("mouseup", ClickOffset.disableOverlay, false);
window.addEventListener("mouseout", ClickOffset.disableOverlay, false);

/** @type {number} */
ClickOffset.dragStopTimer = 0;

/** @param {MouseEvent} ev */
ClickOffset.handleMouseDrag = function (ev) {
	ClickOffset.disableOverlay(ev);

	ClickOffset._overlay.style.display = "block";

	clearTimeout(ClickOffset.dragStopTimer);

	ClickOffset.dragStopTimer = setTimeout(function() {
	}, 50);
};


ClickOffset.prototype.reset = function () {
	var self = this;
	self.start = Date.now();
	self.last = self.start;
	self.position.x = 0;
	self.position.y = 0;
	return this;
};
/**
 * @param {number} x
 * @param {number} y
 */
ClickOffset.prototype.update = function(x, y){
	var self = this;
	self.last = Date.now();
	self.position.x = x;
	self.position.y = y;
	var lastPosition = self.position.clone();
	self.difference = self.lastPosition.clone().sub(self.position);

	self.lastPosition = lastPosition;
	return self;
};

ClickOffset.prototype.clear = function () {
	this.clickX = 0;
	this.clickY = 0;
};
/**
 * @param {number} x
 * @param {number} y
 * @param {number} [width ]
 * @param {number} [height]
 * @param {number} [startX]
 * @param {number} [startY]
 */
ClickOffset.prototype.init = function (x, y, width, height, startX, startY) {
	this.reset();
	this.clickX = x;
	this.clickY = y;
	if (typeof width !== "number" || typeof height !== "number" || typeof startX !== "number" || typeof startY !== "number") return;
	this.width = width;
	this.height = height;
	this.startX = startX;
	this.startY = startY;
	return this;
};

/**
 * @param {boolean} enable
 * @param {(ev:PointerEvent|MouseEvent)=>void} handler
 * @param {Cursor} [cursor]
 */
ClickOffset.toggleDragEventHandler = function (enable, handler, cursor) {
	if (enable) document.addEventListener(supportsPointer ? "pointermove" : "mousemove", handler, false);
	else document.removeEventListener(supportsPointer ? "pointermove" : "mousemove", handler, false);
	if (flags.verboseLogs) console.log(enable ? "Starting drag" : "Ending drag");

	if (!flags.useDragOverlay || !this._overlay) {
		windowManager.forEachWindow(function(dialog) { dialog.togglePointerEvents(!enable); });
		return;
	}

	if (cursor) this._overlay.style.cursor = cursor;
	else this._overlay.style.cursor = "";
	if (enable) document.body.appendChild(this._overlay);
	else this.disableOverlay();
};

/**
 * @param {boolean} enable
 * @param {Cursor} [cursor]
 */
ClickOffset.prototype.toggleDragEventHandler = function (enable, cursor) {
	if (this.dragHandler) ClickOffset.toggleDragEventHandler(enable, this.dragHandler, cursor);
};

//#endregion

//#region Dialog


/**
 * A window that can be moved around and resized and stuff.
 * @author Lasse Lauwerys
 * @param {HTMLElement | Application} object This is a dialog element from the HTML structure, or an object that defines the properties of the window.
 * @param {boolean} [create]
 */
function Dialog(object, create) {

	this._x = 0;
	this._y = 0;
	this._z = 0;
	this._width = 0;
	this._height = 0;
	this._isMinWidth = false;
	this._isMinHeight = false;

	/** @type {Window | null} */
	this._popupWindow = null;

	/** @type {string| null} */
	this._src = null;

	this._previousX = 0;
	this._previousY = 0;
	this._minWidth = 200;
	this._minHeight = 200;
	this._maxWidth = 1000;
	this._maxHeight = 1000;
	this._minAspectRatio = 0;
	this._maxAspectRatio = Infinity;
	this._mica = flags.useMica;

	this._useTransform = useTransform;
	this._useScale = useScale;

	this._skew = 0;
	this._scaleX = 0;
	this._scaleY = 0;
	this._rotation = 0;

	this._maximizing = false;
	this.maximizeAnimations = 0;


	/** Tracks the persisted open/closed state. The isOpen property is backed by a CSS class that gets applied asynchronously in a requestAnimationFrame, so it cannot be used for saving state synchronously! */
	this._stateOpen = false;
	/** @readonly */
	this._bodyOffset = { width: 0, height: 0, x: 0, y: 0 };

	/** @type {{_fsTimeout: number | null, _fsRaf: number | null, _fsToken: number | null, _fsTokenAtStart: number | null }} @readonly */
	this._animationProps = { _fsTimeout: 0, _fsRaf: null, _fsToken: null, _fsTokenAtStart: null };

	if (!object) return;
	if (!create) create = false;

	/** @type {HTMLElement | null} */
	this.target = null;
	var id = object.id;

	/** @type {Application | null} */
	this.application = null;
	if (!isElement(object))
		this.application = object;

	if (!id) id = object.title;
	if (object.title) this._title = object.title;
	else {
		var titleElement = this.getTitleElement();
		if (titleElement) this._title = titleElement.innerText;
		if (!id) id = this.id || this.title || "";
	}



	this._id = id;
	/** @type {HTMLButtonElement[]} */
	this.buttons = [];
	this.originalBody = this.body;
	this.clickOffset = new ClickOffset;

	if(!this.scroll && this.body) this.body.style.overflow = "hidden";

	var applist = document.getElementById("applist");
	if (applist) applist.appendChild(this.createOpenButton());

	var metroapplist = document.getElementById("metroapplist");
	if (metroapplist) metroapplist.appendChild(this.createOpenButton());
	if (create || isElement(object)) this.initWithObject(object);

	this._popupPositionInterval = 0;

	this.dragging = false;

	/** @type {HTMLImageElement| null} */
	this._appIcon = null;
}



/**
 * @param {string} name
 * @param {Element} [parent]
 */
Dialog.prototype.getElementByTagOrClassName = function (name, parent) {
	var target = parent || this.target;
	if (!target) return null;
	var elements = target.getElementsByTagName(name);
	if (!elements || !elements.length) elements = target.getElementsByClassName(name);
	var element = elements.length ? elements[0] : null;
	if (isElement(element)) return element;
	return null;
};

/** @param {HTMLElement | Application | Dialog} object */
Dialog.prototype.initWithObject = function(object) {
	if (!object) return;

	if (object instanceof Dialog) {
		if (object.target) return;
		else if (object.application) object = object.application;
	}

	if (!(object instanceof Dialog)) {
		if (isElement(object)) {
			if (!isDialog(object)) return console.warn("This is not a dialog element");
			this.target = object;
			if (this.target.parentElement && this.target.parentElement.nodeName === "TEMPLATE") return;
			this.close();
		} else {
			this.application = object;
			this.target = createDialog();
			if (this.target && "dialog" in this.target) this.target.dialog = this;

			if (object.classes && typeof object.classes === "object"){
				object.classes.forEach(function (clazz) { this.target && this.target.classList.add(clazz); }, this); // `class` is a reserved keyword.
			}
			this.openUrl(object.src);
			this.setTitle(object.title);
			this.fixed = object.fixed;
			this.scroll = object.scroll;
			if (this.frame) {
				if (object.microphone || object.camera) this.frame.setAttribute("allow", "camera; microphone");
				this.frame.setAttribute("allow", "fullscreen");
			}

			this.moveEvents = object.moveEvents || false;

			this.setIcon(this.getMiniIconUrl(), function() {
				self.setIcon(self.getIconUrl());
			});
		}
	}

	this.setMinSize(180, 250);

	this.originalBody = this.body;

	if(!this.scroll && this.body) this.body.style.overflow = "hidden";

	this.toggleCloseButton(true);
	this.toggleFullButton(true);
	if (this.verifyEjectCapability()) this.toggleEjectButton(true);

	this.exchangeDialogMouseUpEvent = this.messageFrame.bind(this, "mouseUp", { difference: new Vector });

	var self = this;
	/** @param {Position} difference */
	this.exchangeDialogMoveEvent = function(difference) { // Fire-and-forget; keep window move as fast as possible.
		if (difference && self.clickOffset) this.messageFrame("windowMove", self.clickOffset.update(difference.x, difference.y));
	};

	/**
	 * @param {MouseEvent|PointerEvent} ev
	 */
	var activationHandler = function (ev) {
		if (ev.target instanceof HTMLElement && ev.target.classList.contains("touch") && (!("pointerType" in ev) || ev.pointerType !== "touch"))
			return false;
		windowManager.windowActivationEvent(ev, self);
		return true;
	};

	var target = this.target;
	if (target) {

		var createSizers = true;
		var createTouchSizers = true;

		if (!supportsPointer) createTouchSizers = false;

		if(!this.fixed && createSizers) {
			/**
			 * @this {Dialog}
			 * @param {number} id
			 */
			var createSizer = function (id) {
				if (!target) return;

				var sizerId = "sizer-" + id;

				var sizer = this.getElementByTagOrClassName(sizerId);
				if (!sizer || !(isElement(sizer))) sizer = document.createElement("div");
				sizer.draggable = false;
				sizer.id = id.toString();
				sizer.classList.add(sizerId);
				/** @param {PointerEvent | MouseEvent} ev */
				var pointerDown = function (ev) {
					if (!activationHandler(ev)) return;
					windowManager.dragAction.set(id);
					cancelDomEvent(ev);
				};
				if (supportsPointer) sizer.onpointerdown = pointerDown;
				else sizer.onmousedown = pointerDown;
				target.appendChild(sizer);

				if (createTouchSizers) {
					var touchSizerId = "touch-sizer-" + id;

					var touchSizer = this.getElementByTagOrClassName(touchSizerId);
					if (!touchSizer || !isElement(touchSizer)) touchSizer = document.createElement("div");

					touchSizer.draggable = false;
					touchSizer.id = "touch-" + id;
					touchSizer.classList.add(touchSizerId);
					touchSizer.classList.add("touch");

					if (supportsPointer) touchSizer.onpointerdown = pointerDown;

					target.appendChild(touchSizer);
				}
			};

			for (var i = 0; i < 8; i++) createSizer.call(this, i + 1);
		}

		target.addEventListener("dragstart", cancelDomEvent, false);
		target.addEventListener("selectstart", cancelDomEvent, false);

		var body = this.body;
		if (body)
			body.addEventListener("load", function () { try { self.verifyEjectCapability(); } catch (exception) { if (target) target.getElementsByTagName("button")[0].style.display = "none"; }}, false);

		var header = this.titleBar;
		if (header)
			header.addEventListener("dblclick", this.toggleMaximized.bind(this, undefined), false);


		if (supportsPointer) target.addEventListener("pointerdown", activationHandler, false);
		else target.addEventListener("mousedown", activationHandler, false);

		target.getElementsByTagName("button")[windowButtons.eject].addEventListener("click", function() {
			self.createPopout();
			self.quit();
		}, false);

		var buttons = target.getElementsByTagName("button");
		buttons[windowButtons.close].addEventListener("click", this.close.bind(this), false);
		buttons[windowButtons.full].addEventListener("click", this.toggleMaximized.bind(this, undefined), false);

		this.toggleOpen(false);
	}

	if (this.id) windowManager.windows[this.id] = this;

	this.updateUseTransform(this.useTransform);
	this.updateScale(this.useScale);
	this.update();

	if (!isElement(object))
		if (object instanceof Dialog)
			this.move(object.x, object.y);
		else this.moveToCenter(window.innerWidth / 2, window.innerHeight / 2);
};

Object.defineProperty(Dialog.prototype, "isOpen", {
	get: function() { return Boolean(this.target && this.target.classList.contains("open")); },
	set: function(open) { this.toggleOpen(open); }
});
Object.defineProperty(Dialog.prototype, "frame", {
	get: function() { return this.target && this.target.getElementsByTagName("iframe")[0] || null; }
});
Dialog.prototype.reportState = function() {
	this.messageFrame("windowSize", {});
	this.messageFrame("theme", {className: document.body.className});
};
/**
 * @param {boolean} [forceOpen]
 * @param {boolean} [kill]
 */
Dialog.prototype.toggleOpen = function (forceOpen, kill) {
	var target = this.target;
	if (!target) return;
	var self = this;
	this._stateOpen = forceOpen || false;
	this.toggleClassAnimated("open", forceOpen, function(a) {
		return a === "opacity";
	}, function (opened) {
		if ((kill || flags.windowReaper) && !opened) self.kill();
		if (opened) self.reportState();
	}, function (opening) {
		self._stateOpen = opening;
		if (opening) self.activate();
		if (flags.windowReaper && !opening) setTimeout(function() {
			// self.kill();
		}, 1000);
	});

	windowManager.saveState();
	self.reportState();

};
/**
 * @param {boolean} [create]
 * @returns {HTMLIFrameElement| null}
 */
Dialog.prototype.getOrCreateFrame = function(create) {
	var frame = this.frame;
	if (frame || !create || !this.body) return frame;
	return this.body.appendChild(document.createElement("iframe"));
};
Object.defineProperty(Dialog.prototype, "src", {
	get: function() { return this._src || this.application && this.application.src; },
	set: function(url) { this.openUrl(url); }
});
Object.defineProperty(Dialog.prototype, "body", {
	get: function() {
		var content = this.content;
		if (!content) return null;
		return this.getElementByTagOrClassName("article", content);
	}
});
Object.defineProperty(Dialog.prototype, "titleBar", {
	get: function() { return this.getElementByTagOrClassName("header"); }
});
Object.defineProperty(Dialog.prototype, "contentDocument", {
	get: function() {
		var frame = this.frame;
		return frame ? frame.contentDocument : null;
	}
});
Object.defineProperty(Dialog.prototype, "contentWindow", {
	get: function() {
		var frame = this.frame;
		return frame ? frame.contentWindow : null;
	}
});

Object.defineProperty(Dialog.prototype, "mica", {
	get: function() { return this._mica; },
	set: function(mica) {
		if (mica) this._mica = this.injectMica();
		else this._mica = this.removeMica();
			this.move();
	}
});


Object.defineProperty(Dialog.prototype, "x", {
	get: function () {
		return this._x * window.innerWidth; // TODO: get ehe window bounds calced on resize evt
	},
	set: function (x) {
		if (typeof x === "number") this.move(x, this.y);
	}
});

Object.defineProperty(Dialog.prototype, "y", {
	get: function () {
		return this._y * window.innerHeight;
	},
	set: function (y) {
		if (typeof y === "number") this.move(this.x, y);
	}
});

Object.defineProperty(Dialog.prototype, "z", {
	get: function () { return this._z; },
	set: function (z) {
		if (typeof z === "number") this.setZ(z);
	}
});

Object.defineProperty(Dialog.prototype, "width", {
	get: function() { return this._width; },
	set: function(width) { this.setWidth(width); }
});

Object.defineProperty(Dialog.prototype, "height", {
	get: function() { return this._height; },
	/** @param {number} height */
	set: function(/** @type {number} */height) { this.setHeight(height); }
});
Object.defineProperty(Dialog.prototype, "minWidth", {
	get: function() { return this._minWidth; },
	set: function(width) { this.setMinSize(width); }
});
Object.defineProperty(Dialog.prototype, "minHeight", {
	get: function() { return this._minHeight; },
	set: function(height) { this.setMinSize(this.minWidth, height); }
});
Object.defineProperty(Dialog.prototype, "maxWidth", {
	get: function() { return this._maxWidth; },
	set: function(width) { this.setMaxSize(width); }
});
Object.defineProperty(Dialog.prototype, "maxHeight", {
	get: function() { return this._maxHeight; },
	set: function(height) { this.setMaxSize(this.maxWidth, height); }
});
/** @type {{x:number,y:number}} */
Object.defineProperty(Dialog.prototype, "position", {
	get: function() { return new Vector(this.x, this.y); },
	set: function(position) {
		if (position instanceof Vector)
			this.move(position.x, position.y);
	}
});

Object.defineProperty(Dialog.prototype, "size", {
	get: function() { return new Vector(this.width, this.height); },
	set: function(size) {
		if (typeof size.x !== "number" || typeof size.y !== "number") return;
		this.resize(size.x, size.y);
	}
});

Object.defineProperty(Dialog.prototype, "aspectRatio", {
	get: function() { return this.width / this.height; },
	set: function(aspect) { this.width = this.height * aspect; }
});

Object.defineProperty(Dialog.prototype, "minAspectRatio", {
	get: function() { return this._minAspectRatio; },
	set: function(aspect) { this.width = this.height * aspect; }
});

Object.defineProperty(Dialog.prototype, "maxAspectRatio", {
	get: function() { return this._maxAspectRatio; },
	set: function(aspect) { this.width = this.height * aspect; }
});

Object.defineProperty(Dialog.prototype, "top", {
	get: function() { return this.y; },
	set: function(top) {
		var bounds = WindowManager.getWindowBounds();
		var bottom = this.bottomFromTop;
		if (bounds.bottom !== Infinity && bottom >= bounds.bottom - 0.5) bottom = bounds.bottom;
		if (top < bounds.top) top = bounds.top;
		var height = Math.max(Math.min(bottom - top, this.maxHeight), this.minHeight);
		top = bottom - height;
		this._height = height;
		this._y = top / window.innerHeight;
		if (this.useTransform) {
			if (this.target) this.target.style.height = toPixels(height);
			if (this.useTransform) this.updateTranslation();
		} else this.setInset(top, this.left, this.right, window.innerHeight - bottom);
		this._isMinHeight = height === this.minHeight;
	}
});

Object.defineProperty(Dialog.prototype, "left", {
	get: function() { return this.x; },
	set: function(left) {
		var bounds = WindowManager.getWindowBounds();
		var right = this.rightFromLeft;
		if (bounds.right !== Infinity && right >= bounds.right - 0.5) right = bounds.right;
		if (left < bounds.left) left = bounds.left;
		var width = Math.max(Math.min(right - left, this.maxWidth), this.minWidth);
		left = right - width;
		this._width = width;
		this._x = left / window.innerWidth;
		if (this.useTransform) {
			if (this.target) this.target.style.width = toPixels(width);
			if (this.useTransform) this.updateTranslation();
		} else this.setInset(this.top, left, window.innerWidth - right, this.bottom);
		this._isMinWidth = width === this.minWidth;
	}
});

Object.defineProperty(Dialog.prototype, "rightFromLeft", {
	get: function() { return this.x + this.width; },
	set: function(right) { this.width = right - this.x; }
});

Object.defineProperty(Dialog.prototype, "right", {
	get: function() { return window.innerWidth - this.rightFromLeft; },
	set: function(right) {
		if (typeof right === "number") {
			var bounds = WindowManager.getWindowBounds();
			if (right > bounds.right) right = bounds.right;
			if (right < bounds.left) right = bounds.left;
			this.width = (window.innerWidth - right) - this.x;
		}
	}
});

Object.defineProperty(Dialog.prototype, "bottomFromTop", {
	get: function() { return this.y + this.height; },
	set: function(bottom) { this.height = bottom - this.y; }
});

Object.defineProperty(Dialog.prototype, "bottom", {
	get: function() { return window.innerHeight - this.bottomFromTop; },
	set: function(bottom) {
		if (typeof bottom === "number") {
			var bounds = WindowManager.getWindowBounds();
			if (bottom > bounds.bottom) bottom = bounds.bottom;
			if (bottom < bounds.top) bottom = bounds.top;
			this.height = (window.innerHeight - bottom) - this.y;
		}
	}
});

Object.defineProperty(Dialog.prototype, "inset", {
	get: function() { return (this.bottom + this.right + this.left + this.top) / 4; },
	set: function(inset) { this.bottom = this.right = this.left = this.top = inset; }
});

Object.defineProperty(Dialog.prototype, "isMinWidth", {
	get: function () { return this._isMinWidth; }
});

Object.defineProperty(Dialog.prototype, "isMinHeight", {
	get: function () { return this._isMinHeight; }
});

Object.defineProperty(Dialog.prototype, "useTransform", {
	get: function () { return this._useTransform; },
	set: function(useTransform) { this.updateUseTransform(useTransform); }
});

Object.defineProperty(Dialog.prototype, "useScale", {
	get: function () {return this._useScale; },
	set: function(useScale) { this.updateScale(useScale); }
});

Object.defineProperty(Dialog.prototype, "title", {
	get: function() {
		if (this._title) return this._title;
		var titleElement = this.getTitleElement();
		if (titleElement && titleElement.innerHTML) return titleElement.innerHTML;
		return this.id;
	},
	set: function(title) { this.setTitle(title); }
});

Object.defineProperty(Dialog.prototype, "maximized", {
	get: function() {
		if (!this.target) return false;
		return this.target.classList.contains("maximized");
	},
	set: function(maximized) { this.toggleMaximized(maximized); }
});

Object.defineProperty(Dialog.prototype, "windowTarget", {
	get: function() {
		var target = this.target;
		if (target && "dialog" in target)
			return /** @type {WindowElement} */ (target);
		return null;
	}
});

/** @param {string} title */
Dialog.prototype.setTitle = function(title) {
	this._title = title;
	var titleElement = this.getTitleElement();
	if (titleElement) titleElement.innerHTML = title;
};

Object.defineProperty(Dialog.prototype, "id", {
	get: function() { return this._id || (this.target && this.target.getAttribute("id")); },
	set: function(id) {
		this._id = id;
		windowManager.windows[id] = this;
		if (this.target) this.target.setAttribute("id", id);
	}
});

Object.defineProperty(Dialog.prototype, "content", {
	get: function() {
		if (!this.target) return null;
		return this.getElementByTagOrClassName("content");
	}
});

Object.defineProperty(Dialog.prototype, "closeable", {
	get: function() { return this.application !== null; }
});

Object.defineProperty(Dialog.prototype, "borderSize", {
	set: function (value) {
		if (!this.content) return;
		this.content.style.padding = toPixels(value);
		this.content.style.border = toPixels(value);
		this.content.style.borderRadius = toPixels(value);
	},
	get: function () { return this.content && fromPixels(this.content.style.padding); }
});

Object.defineProperty(Dialog.prototype, "popup", {
	get: function() { return this._popupWindow; }
});

Object.defineProperty(Dialog.prototype, "micaElement", {
	get: function() {
		try { // TODO: cache the element so it doesn't have to be refretched each time! add _micaElement to the dialog thing as an otpional prop
			if (!this.target) return null;
			var clipElem = this.target.getElementsByClassName("backdrop-filter");
			if (!clipElem.length) return null;
			var clip = clipElem[0];
			if (isElement(clip)) return clip;
		} catch(ex) { if (ex instanceof Error) console.log(ex.message); }
		return null;
	}
});

Object.defineProperty(Dialog.prototype, "micaBackdrop", {
	get: function() {
		try {
			var micaElement = this.micaElement;
			if (!micaElement) return null;
			var backdrop = micaElement.children[0];
			if (isElement(backdrop)) return backdrop;
		} catch(ex) { if (ex instanceof Error) console.log(ex.message); }
		return null;
	}
});

Object.defineProperty(Dialog.prototype, "skew", {
	set: function(/** @type {number} */skew) { this.setSkew(skew); }
});

Object.defineProperty(Dialog.prototype, "scaleY", {
	set: function(/** @type {number} */scaleY) { this.setScaleY(scaleY); }
});
Object.defineProperty(Dialog.prototype, "rotation", {
	set: function(/** @type {number} */rotation) { this.setRotation(rotation); }
});
Object.defineProperty(Dialog.prototype, "opacity", {
	set: function(/** @type {number} */opacity) { this.target && (this.target.style.opacity = String(opacity)); },
	get: function() { return this.target && this.target.style.opacity !== "" ? Number(this.target.style.opacity) : 1; }
});

Object.defineProperty(Dialog.prototype, "icon", {
	get: function() { return this._appIcon; }
});

Object.defineProperty(Dialog.prototype, "iconUrl", {
	get: function() {
		return this.getIconUrl();
	}
});

Dialog.prototype.getIconUrl = function() {
	if (!this.application) return null;
	if (this.application.iconUrl) {
		return this.application.iconUrl;
	} else {
		return getFaviconUrl(this.application.src);
	}
};

Dialog.prototype.getMiniIconUrl = function() {
	if (!this.application) return null;
	return getFaviconUrl(this.application.src);
};

/**
 * @param {string | null} iconUrl
 * @param {()=>void} [onError]
 */
Dialog.prototype.setIcon = function(iconUrl, onError) {
	if (!this.target) return;
	if (!iconUrl) {
		if (onError) onError();
		return;
	}
	var headers = this.target.getElementsByTagName("header");
	if (!headers.length) return;
	this._appIcon = headers[0].getElementsByTagName("img")[0];

	var self = this;
	this._appIcon.onload = function () {
		console.log("App icon loaded!!");
		if (self._appIcon) self._appIcon.className = "loaded";
	};

	this._appIcon.onerror = function (e) {
		console.warn("App icon error!", e);
		if (self._appIcon) self._appIcon.className = "";
		if (onError) onError();
	};

	this._appIcon.src = iconUrl;
};

/** @param {number} skew */
Dialog.prototype.setSkew = function(skew) {
	this._skew = skew;
	if (this.useTransform)
			this.updateTranslation();
	else if (this.target) skewElement(this.target, skew);
};
/**
 * @param {number} scaleX
 * @param {number} scaleY
 * @param {boolean} [update]
 */
Dialog.prototype.setScale = function(scaleX, scaleY, update) {
	this._scaleX = scaleX;
	this._scaleY = scaleY;
	if (update !== false) this.updateTranslation();
};
/** @param {number} scaleX */
Dialog.prototype.setScaleX = function(scaleX) {
	this._scaleX = scaleX;
	this.updateTranslation();
};
/** @param {number} scaleY */
Dialog.prototype.setScaleY = function(scaleY) {
	this._scaleY = scaleY;
	this.updateTranslation();
};
/** @param {number} rotation */
Dialog.prototype.setRotation = function(rotation) {
	this._rotation = rotation;
	this.updateTranslation();
};


Dialog.prototype.focus = function() { windowManager.focusDialog(this); };
Dialog.prototype.activate = function() {
	this.focus();
	this.setZ();
	this.messageFrame("open");
	this.activeDialog = this;
	return swapMetroBody();
};
Dialog.prototype.getTitleElement = function() { return this.getElementByTagOrClassName("h1"); };
/** @param {boolean} force */
Dialog.prototype.toggleTitleBar = function (force) {
	return this.titleBar && !this.titleBar.classList.toggle( "hidden", typeof force !== "undefined" ? !force : undefined);
};
Dialog.prototype.open = function () {
	return this.toggleOpen(true);
};
Dialog.prototype.close = function () {
	return this.toggleOpen(false);
};
Dialog.prototype.getInnerRect = function () {
  	if (!this.target) return;
	return {
		top: this.target.offsetTop,
		left: this.target.offsetLeft,
		right: this.target.offsetLeft + this.target.offsetWidth,
		bottom: this.target.offsetTop + this.target.offsetHeight,
		width: this.target.offsetWidth,
		height: this.target.offsetHeight
	};
}; // Builds a rect without extra function calls, including the dimension offsets caused by CSS transforms, so windows move correctly while an animation plays.

/** @param {number} [index] */
Dialog.prototype.getRect = function (index) { return getRect(this.target, index); };
/** @param {number} [index] */
Dialog.prototype.getBodyRect = function (index) { return getRect(this.body, index); };
/** @param {number} index */
Dialog.prototype.getButton = function (index) {
  return this.titleBar && this.titleBar.getElementsByTagName("button")[index];
};
Dialog.prototype.createOpenButton = function () {
	var openButton = document.createElement("button");
	this.buttons.unshift(openButton);
	openButton.appendChild(document.createTextNode(this.title || "?"));
	openButton.onclick = this.launch.bind(this);
	return openButton;
};
/**
 * @param {number} x
 * @param {number} y
 */
Dialog.prototype.setClickOffset = function(x, y) {
	var rect = this.getRect();
	if (!this.clickOffset || !rect) return;
	return this.clickOffset.init(x, y, this.width || rect.width, this.height || rect.height, this.x, this.y);
};
Dialog.prototype.verifyEjectCapability = function() { return Boolean(this.href); };
Object.defineProperty(Dialog.prototype, "href", { get: function () {
	if (!this.application) return null;
	return this.application.src;
}});
/** @param {boolean} enable */
Dialog.prototype.togglePointerEvents = function(enable) {
	var target = this.target;
	if (!target) return;
	if (enable === null) enable = target.style.pointerEvents === "none";
	if (enable) while (target.classList.contains("dragging")) target.className = target.className.replace("dragging", "");
	else if (!target.classList.contains("dragging")) target.className = target.className + " dragging";

	this.dragging = !enable;

	var events = enable ? "auto" : "none";
	target.style.pointerEvents = events;
	if (this.originalBody) this.originalBody.style.pointerEvents = events;
	var frame = this.frame;
	if (frame) frame.style.pointerEvents = events;
	return events;
};
/**
 * @param {number} buttonId
 * @param {boolean} [enable]
 */
Dialog.prototype.toggleButton = function (buttonId, enable) {
	var button = this.getButton(buttonId);
	return button && button.toggleAttribute("disabled", !enable);
};


Dialog.prototype.stopAnimating = function () {
	if (!this.target) return;
	this.target.classList.remove("animating");
};
/**
 * @param {string} className
 * @param {boolean} [force]
 * @param {string} [animationEndTrigger]
 * @param {()=>void} [onEnd]
 * @param {(this:Dialog,enabled:boolean)=>void} [onToggled]
 */
Dialog.prototype.toggleClassAnimatedOld = function (className, force, animationEndTrigger, onEnd, onToggled) {
	this.toggleClassAnimated(className, force, function(propertyName) {
		return propertyName === animationEndTrigger;
	}, onEnd, onToggled);
};

/**
 * @param {(this:Dialog)=>void} [onToggled]
 * @param {(name:string)=>boolean} [onTransitionEnd]
 * @param {(this:Dialog)=>void} [onEnd]
 */
Dialog.prototype.animate = function (onToggled, onTransitionEnd, onEnd) {
	var target = this.target;
	if (!target) return;
	var dialog = this;
	if (supportsTransitions) {
		target.classList.add("animating");
		/** @type {(ev: TransitionEvent)=>void} */
		var animationHandler = function(event) {
			if (onTransitionEnd && !onTransitionEnd(event.propertyName) || !target) return;
			dialog.stopAnimating();
			console.log("Aborting animation over " + event.propertyName + ". Took: ", event.elapsedTime, "seconds. Reported by: ", event.target);
			target.removeEventListener(transitionEndEvent, animationHandler, false);
			if (onEnd) onEnd.call(dialog);
		};
		target.addEventListener(transitionEndEvent, animationHandler, false);
	}

	window.requestAnimationFrame(function() {
		if (onToggled) onToggled.call(dialog);
	});
};
/**
 * @param {string} className
 * @param {boolean} [force]
 * @param {(name:string)=>boolean} [onTransitionEnd]
 * @param {(this:Dialog,enabled:boolean)=>void} [onEnd]
 * @param {(this:Dialog,enabled:boolean)=>void} [onToggled]
 */
Dialog.prototype.toggleClassAnimated = function (className, force, onTransitionEnd, onEnd, onToggled) {
	var self = this;
	var enabled = false;
	this.animate(function() {
		if (self.target && onToggled) onToggled.call(self, enabled = setClass(self.target, className, force));
	}, onTransitionEnd, function() { if (onEnd) onEnd.call(self, enabled); });
};

/** @param {boolean} [enable] */
Dialog.prototype.toggleMaximized = function (enable) {

	if (this.maximized === enable) return;
	if (!this.target) return;

	var self = this;
	var content = this.content;

	this.setZ();

	this.maximizeAnimations++;
	if (flags.useViewTransitionMaximize && this.windowTarget)
		return this.windowTarget.toggleMaximizedVT(enable);

	if (supportsTransitions) !flags.compositorResize ? this.toggleClassAnimated("maximized", enable, function(name) {
		return name === "transform" || name === "width";
	}, undefined, function() {
		self.maximizeAnimations--;
	}) : this.toggleClassAnimated("scaled-max", enable, function(name) {
		return name === "transform";
	}, function onEnd(enabled) {
		if (self._animationProps._fsTimeout) clearTimeout(self._animationProps._fsTimeout);
		var target = this.target;
		if (!target) return;

		target.classList.toggle("maximized", enabled);


		this.setScale(1, 1);
		if (!content) return;
		translateElement(content, 0, 0, 0, 1, 1);
		content.style.width = "";
		content.style.height = "";
		this.maximizeAnimations--;

	}, function onToggled(enabled) {
		var timeOffsetMs = 50;
		var totalDuration = 280; //Can I uh get this from uh the css somehow
		var invertDurationOnShrink = false;

		var target = this.target;
		if (!target) return;

		this._maximizing = enabled;

		var startWidth = this.width;
		var startHeight = this.height;

		var windowSection = document.getElementById("window-section");
		var height = windowSection ? windowSection.clientHeight : window.innerHeight;

		var scaleX = window.innerWidth / startWidth;
		var scaleY = height / startHeight;

		target.style.transformOrigin = "top left";
		target.style.pointerEvents = "none";

		if (!enabled) {
			if (invertDurationOnShrink) timeOffsetMs = totalDuration - timeOffsetMs;

			scaleX = 1 / scaleX;
			scaleY = 1 / scaleY;
		}

		this.setScale(scaleX, scaleY);

		var targetWidth = enabled ? window.innerWidth : self.width;
		var targetHeight = enabled ? height : self.height;



		self._animationProps._fsTimeout = setTimeout(function() {
			requestAnimationFrame(function() {
				if (!content) return;
				content.style.width = toPixels(targetWidth);
				content.style.height = toPixels(targetHeight);
				void content.offsetWidth;

				translateElement(content, 0, 0, 0, 1 / scaleX, 1 / scaleY);
			});
		}, timeOffsetMs);
	});
	else {
		var startPos = self.position;
		var startSize = self.size;
		var target = self.target;
		if (!target) return;
		enable = !target.classList.contains("maximized");
		var toggleMaximized = function() {
			self.x = startPos.x;
			self.y = startPos.y;
			self.width = startSize.x;
			self.height = startSize.y;
			if (self.target) self.target.classList.toggle("maximized", enable);
		};
		if (!enable) toggleMaximized();
		Anim.animate(300, function(t) {
			var ease = Anim.easeSharpCenterStrong;
			if (enable) {
				self.x = Anim.lerp(startPos.x, 0, ease(t));
				self.y = Anim.lerp(startPos.y, 0, ease(t));
				self.width = Anim.lerp(startSize.x, window.innerWidth, ease(t));
				self.height = Anim.lerp(startSize.y, window.innerHeight, ease(t));
			} else {
				self.x = Anim.lerp(0, startPos.x, ease(t));
				self.y = Anim.lerp(0, startPos.y, ease(t));
				self.width = Anim.lerp(window.innerWidth, startSize.x, ease(t));
				self.height = Anim.lerp(window.innerHeight, startSize.y, ease(t));
			}
		}, function() {
			if (enable) toggleMaximized();
		});
	}
};
Dialog.prototype.maximize = function () {
  	this.toggleMaximized(true);
};
/** @param {boolean} [enable] */
Dialog.prototype.toggleCloseButton = function (enable) {
  	this.toggleButton(windowButtons.close, enable);
};
/** @param {boolean} [enable] */
Dialog.prototype.toggleEjectButton = function (enable) {
  	this.toggleButton(windowButtons.eject, enable);
};
/** @param {boolean} [enable] */
Dialog.prototype.toggleFullButton = function (enable) {
  	this.toggleButton(windowButtons.full, enable);
};
/**
 * @param {MessageType} type
 * @param {*} [message]
 */
Dialog.prototype.messageFrame = function (type, message) {
	var frame = this.frame;
	if (frame) LVMessenger.broadcastToChild(type, frame, message);
};
Dialog.prototype.updateTranslation = function () {
	if (this.useTransform && this.target) translateElement(this.target, this._maximizing ? 0 : this.x, this._maximizing ? 0 : this.y, this._skew, this._scaleX, this._scaleY, this._rotation);
};
Dialog.prototype.updatePosition = function() {
	if (!this.target) return;
	if (this.useTransform) this.updateTranslation();
	else this.setInset(this.top, this.left, this.right, this.bottom);

	if (flags.useSkewAnimations) {
		var deltaX = this.x - this._previousX, deltaY = this.y - this._previousY;

		var intensity = 1;

		this.skew = -deltaX * intensity / 3;
		this.scaleY = 1 - deltaY * intensity / 100;
	}

	if (!flags.useMica) return;
	var micaElement = this.micaElement;
	if (micaElement) try {
		var backdrop = micaElement.firstChild;
		var wallpaperP = document.getElementById("wallpaper");
		if (!wallpaperP) return;
		var wallpaperImage = wallpaperP.children[0];
		if (!(isElement(backdrop)) || !wallpaperImage) return;
		translateElement(backdrop, -this.x, -this.y);

		var wallpaperWidth = wallpaperImage instanceof HTMLImageElement && wallpaperImage.clientWidth ? wallpaperImage.clientWidth : wallpaperP.clientWidth;
		var wallpaperHeight = wallpaperImage instanceof HTMLImageElement && wallpaperImage.clientHeight ? wallpaperImage.clientHeight : wallpaperP.clientHeight;

		backdrop.style.width = toPixels(wallpaperWidth);
		backdrop.style.height = toPixels(wallpaperHeight);
	} catch(ex) { console.warn(ex); }
};
/**
 * @param {number} [x]
 * @param {number} [y]
 * @param {boolean} [update]
 * @param {boolean} [animate]
 */
Dialog.prototype.move = function (x, y, update, animate) {
	if (flags.useSkewAnimations) {
		this._previousX = this.x;
		this._previousY = this.y;
	}
	if (typeof x === "undefined" || x === null) x = this.x;
	if (typeof y === "undefined" || y === null) y = this.y;
	var bounds = WindowManager.getWindowBounds();
	if (x < bounds.left) x = bounds.left;
	if (bounds.right !== Infinity && x > bounds.right - this.width) x = bounds.right - this.width;
	if (y < bounds.top) y = bounds.top;
	if (bounds.bottom !== Infinity && y > bounds.bottom - this.height) y = bounds.bottom - this.height;
	var windowWidth = window.innerWidth;
	var windowHeight = window.innerHeight;
	this._x = x / windowWidth;
	this._y = y / windowHeight;

	if (update !== false) {
		if (animate) this.animate(this.updatePosition);
		else this.updatePosition();
	}
};
/**
 * @param {number} deltaX
 * @param {number} deltaY
 */
Dialog.prototype.moveBy = function (deltaX, deltaY) {
	this.move(this.x + deltaX, this.y + deltaY);
};

/**
 * Move the dialog so its center point lands at the provided coordinates.
 * @param {number} centerX
 * @param {number} centerY
 */
Dialog.prototype.moveToCenter = function(centerX, centerY) {
	if (typeof centerX !== "number" || typeof centerY !== "number") return;
	this.move(centerX - this.width / 2, centerY - this.height / 2);
};

/** @param {number} [z] */
Dialog.prototype.setZ = function(z) {
	if (typeof z === "undefined") {
		if (this._z !== windowManager.topZ) this._z = ++windowManager.topZ;
	} else this._z = z;
	if (isElement(this.target))
		this.target.style.zIndex = String(this._z);
};
Dialog.prototype.updateWidth = function () {
	if (!this.target) return;
	if (this.useTransform) this.target.style.width = toPixels(this._width);
	else this.target.style.right = toPixels(this.right);
};
Dialog.prototype.updateHeight = function () {
	if (!this.target) return;
	if (this.useTransform) this.target.style.height = toPixels(this._height);
	else this.target.style.bottom = toPixels(this.bottom);
};
/**
 * @param {number} width
 * @param {boolean} [update]
 * @param {boolean} [animate]
 */
Dialog.prototype.setWidth = function (width, update, animate) {
	if (typeof width !== "number") return;

	var bounds = WindowManager.getWindowBounds();

	if (bounds.right !== Infinity) {
		var overflow = this.x + width - bounds.right;
		if (overflow > 0) {
			var newX = this.x - overflow;
			if (bounds.left !== undefined && newX < bounds.left) newX = bounds.left;
			this.move(newX);
		}
	}

	if (bounds.right !== Infinity) width = Math.min(width, bounds.right - this.x);
	this._width = Math.max(Math.min(width, this.maxWidth), this.minWidth);
	this._isMinWidth = this._width === this.minWidth;

	if (update !== false) {
		if (animate) this.animate(this.updateWidth);
		else this.updateWidth();
	}
};
/**
 * @param {number} height
 * @param {boolean} [update]
 * @param {boolean} [animate]
 */
Dialog.prototype.setHeight = function (height, update, animate) {
	if (typeof height !== "number" || !this.target) return;

	var bounds = WindowManager.getWindowBounds();

	if (bounds.bottom !== Infinity) {
		var overflow = this.y + height - bounds.bottom;
		if (overflow > 0) {
			var newY = this.y - overflow;
			if (bounds.top !== undefined && newY < bounds.top) newY = bounds.top;
			this.move(this.x, newY);
		}
	}

	var finalHeight = height;
	if (bounds.bottom !== Infinity) finalHeight = Math.min(finalHeight, bounds.bottom - this.y);

	this._height = Math.max(Math.min(finalHeight, this.maxHeight), this.minHeight);
	this._isMinHeight = this._height === this.minHeight;

	if (update !== false) {
		if (animate) this.animate(this.updateHeight);
		else this.updateHeight();
	}
};
/**
 * @param {number} [width]
 * @param {number} [height]
 */
Dialog.prototype.resize = function (width, height) {
	if (typeof width === "undefined" || width === null) width = this.width;
	if (typeof height === "undefined" || height === null) height = this.height;
	this.setWidth(width);
	this.setHeight(height);
};
Dialog.prototype.update = function () {
	this.move();
	this.resize();
};
/**
 * @param {number} [width]
 * @param {number} [height]
 */
Dialog.prototype.setMinSize = function (width, height) {
	this._minWidth = typeof width === "number" ? width : 180;
	this._minHeight = typeof height === "number" ? height : 200;
	this.resize();
};
/**
 * @param {number} [width]
 * @param {number} [height]
 */
Dialog.prototype.setMaxSize = function (width, height) {
	this._maxWidth = typeof width === "number" ? width : 180;
	this._maxHeight = typeof height === "number" ? height : 200;
	this.resize();
};
/** @param {number} ratio */
Dialog.prototype.setMinAspectRatio = function (ratio) {
	this._minAspectRatio = ratio;
	this.resize();
};

/**
 * @param {number} width
 * @param {number} height
 */
Dialog.prototype.resizeWithAspect = function (width, height) {
	var ratio = this.aspectRatio;

	var widthDelta = Math.abs(width - this.width);
	var heightDelta = Math.abs(height - this.height);

	if (widthDelta > heightDelta) {
		this.resize(width, width / ratio);
	} else {
		this.resize(height * ratio, height);
	}
};
Dialog.prototype.updateBodyOffset = function () {
	var bodyRect = this.getBodyRect();
	if (!bodyRect || (bodyRect.width === 0 && bodyRect.height === 0 && bodyRect.x === 0 && bodyRect.y === 0)) return;
	this._bodyOffset.width = this.width - bodyRect.width;
	this._bodyOffset.height = this.height - bodyRect.height;
	this._bodyOffset.x = this.x - bodyRect.x;
	this._bodyOffset.y = this.y - bodyRect.y;
};
/**
 * @param {number} width
 * @param {number} height
 */
Dialog.prototype.resizeBody = function (width, height) {
	this.updateBodyOffset();
	this.resize(width + this._bodyOffset.width, height + this._bodyOffset.height);
};
/**
 * @param {number} x
 * @param {number} y
 */
Dialog.prototype.moveBody = function (x, y) {
	this.updateBodyOffset();
	this.move(x + this._bodyOffset.x, y + this._bodyOffset.y);
};
/**
 * @param {number} top
 * @param {number} left
 * @param {number} right
 * @param {number} bottom
 */
Dialog.prototype.setInset = function(top, left, right, bottom) {
	if (!this.target) return;
	if (this.target.style.inset) this.target.style.inset = toPixels(top) + " " + toPixels(right) + " " + toPixels(bottom) + " " + toPixels(left);
	else {
		this.target.style.top = toPixels(top);
		this.target.style.left = toPixels(left);
		if (!this.useScale) {
			this.target.style.right = toPixels(right);
			this.target.style.bottom = toPixels(bottom);
		}
	}
};
/** @param {string} url */
Dialog.prototype.openUrl = function(url) {
	var frame = this.getOrCreateFrame(true);
	if (!frame) return;

	var self = this;
	frame.onload = function() {
		self.reportState();
	};

	frame.src = url;
	this._src = url;
};

Dialog.prototype.quit = function() {
	this.close();
};

Dialog.prototype.launch = function() {
	if (!this.isOpen) this.initWithObject(this);
	if (this.mica) this.injectMica();

	this.open();
};

Dialog.prototype.relaunch = function() {
	this.quit();
	this.launch();
};

Dialog.prototype.kill = function() {
	var parent = this.target && this.target.parentElement;
	if (parent && this.closeable && this.target) parent.removeChild(this.target);
};
Dialog.prototype.eject = function() {
	this.createPopout();
	this.quit();
};
Dialog.prototype.createPopout = function() {
	var body = this.body;
	var titleBar = this.titleBar;
	if (!body || !this.href) return;
	var rect = body.getBoundingClientRect();
	var titleBarHeight = titleBar && titleBar.getBoundingClientRect().height || 0;
	var viewBoxPosition = getViewBoxPosition();

	this._popupWindow = window.open(this.href, this.title || "LVOS", stringifyDialogProperties({
		scrollbars: true,
		resizable: true,
		status: false,
		location: false,
		toolbar: false,
		menubar: false,
		width: rect.width,
		height: rect.height,
		left: rect.left + viewBoxPosition.x,
		top: rect.top + viewBoxPosition.y + titleBarHeight
	}));
	if (!this._popupWindow) return;
	var self = this;
	var prevRect = { x: -1, y: -1, width: -1, height: -1 };
	var windowChromeHeight = getWindowChromeHeight(window);
	var chromeHeight = getWindowChromeHeight(this._popupWindow);
	this._popupPositionInterval = setInterval(function() {
		if (!self._popupWindow || self._popupWindow.closed) {
			clearInterval(self._popupPositionInterval);
			self._popupPositionInterval = 0;
			self.launch();
			return;
		}

		var outerX = self._popupWindow.screenX, outerY = self._popupWindow.screenY;
		var width = self._popupWindow.innerWidth || self._popupWindow.outerWidth, height = self._popupWindow.innerHeight || self._popupWindow.outerHeight;
		outerX = Math.round(outerX);
		outerY = Math.round(outerY);
		width = Math.round(width);
		height = Math.round(height);

		if (outerX !== prevRect.x || outerY !== prevRect.y) {
			var x = outerX - window.screenX,
				y = outerY - window.screenY - windowChromeHeight + chromeHeight;

			console.log("pos:", outerX, outerY);
			self.moveBody(x, y);
			prevRect.x = outerX;
			prevRect.y = outerY;
		}

		if (width !== prevRect.width || height !== prevRect.height) {

			self.resizeBody(width, height);

			console.log("size:", width, width);

			prevRect.width = width;
			prevRect.height = height;
		}
	}, 100);
};
Dialog.prototype.inspect = function() { if (window.inspect) window.inspect(this.target); };

/** @param {boolean} useTransform */
Dialog.prototype.updateUseTransform = function(useTransform) {
	this._useTransform = useTransform;
	var target = this.target;
	if (!target) return;
	if (useTransform) {
		target.style.top = "";
		target.style.left = "";
		this.toggleMinSizeConstraints(this.maximized);
	} else {
		target.style.transform = "";
		target.style.webkitTransform = "";
		target.style.width = "";
		target.style.height = "";
	}

	this.updateScale(useTransform);

	this.update();
};
/** @param {boolean} useScale */
Dialog.prototype.updateScale = function(useScale) {
	this._useScale = useScale;
	var target = this.target;
	if (!target) return;
	if (useScale) {
		target.style.right = "";
		target.style.bottom = "";
	} else {
		if (this.useTransform) return console.warn("Cannot disable scale if using transform");
		target.style.right = toPixels(this.right);
		target.style.bottom = toPixels(this.bottom);
	}
	target.classList.toggle("use-scale", useScale);

	this.update();
};

/** @returns {boolean} */
Dialog.prototype.injectMica = function() {
	try {
		if (!this.useTransform) console.warn("Dude you still gotta fix the mica here for oh right but can you possible even do that??");
		if (!this.target) return false;
		var wallpaper = document.getElementById("wallpaper");
		if (!wallpaper) return false;
		// var newWallpaper = wallpaper.cloneNode(true);
		var wallpaperSrc = wallpaper.getAttribute("data-wallpaper-src") || "";
		var blurredSrc = wallpaper.getAttribute("data-blurred-src") || "";
		var preBlurredImage = blurredSrc !== null;
		var clip = this.micaElement;
		if (!clip) return false;
		while (clip.firstChild) clip.removeChild(clip.firstChild);


		var micaWallpaper = null;
		if (isElement(wallpaper.children[0])) {
			micaWallpaper = wallpaper.children[0].cloneNode(true);
			if (!(isElement(micaWallpaper))) return false;
			if (supportsObjectFit) {
				micaWallpaper.removeAttribute("style");
				micaWallpaper.className = "mica-backdrop";
				if (preBlurredImage &&  micaWallpaper instanceof HTMLIFrameElement && blurredSrc)
					micaWallpaper.src = blurredSrc;
			} else {
				micaWallpaper.className = "mica-backdrop legacy-wallpaper-image";
				micaWallpaper.style.backgroundImage = "url('" + (blurredSrc || wallpaperSrc).replace(/'/g, "\\'") + "')";
			}
		} else {
			micaWallpaper = document.createElement("img");
			micaWallpaper.className = "mica-backdrop legacy-wallpaper-image";
			micaWallpaper.style.backgroundImage = "url('" + (blurredSrc || wallpaperSrc).replace(/'/g, "\\'") + "')";
		}

		clip.appendChild(micaWallpaper);
		this.target.classList.add("mica");

		return true;
	} catch(ex) { console.warn(ex); }
	return false;
};

Dialog.prototype.removeMica = function() {
	if (!this.target) return false;
	this.target.classList.remove("mica");
	var clip = this.micaElement;
	if (!clip) return false;
	while (clip.firstChild) clip.firstChild.remove();
	return false;
};

/** @param {boolean} [enable] */
Dialog.prototype.flip = function(enable) {
	this.toggleClassAnimated("flipped", enable);
};

Dialog.prototype.makeWallpaper = function() { if (this.id) appRegistry.setWallpaper(this.id); };

/** @returns {DialogState} */
Dialog.prototype.getState = function() {
	return {
		title: this.title || this.id || "Unc",
		x: this.x,
		y: this.y,
		z: this.z,
		width: this.width || this.minWidth,
		height: this.height || this.minHeight,
		open: this._stateOpen || this.isOpen || false,
		maximized: this.maximized
	};
};

/** @param {DialogState} state */
Dialog.prototype.loadState = function(state) {
	if (state.open) this.launch();
	this.title = state.title;
	this.move(state.x, state.y);
	this.setZ(state.z);
	this.resize(state.width, state.height);
	console.log(state.title, "window loaded width: ", state.width, state.height);
	this.toggleMaximized(state.maximized);
};

Dialog.prototype.exportDialogBodyToMetro = function() {

};
/** @param {string} id */
Dialog.prototype.getElementById = function(id) {
	console.log("Element ID to pull out of my guts: " + id);
	var doc = dialog.contentDocument;
	if (!doc) break;
	var targetElement = doc.getElementById(id);
	console.log("Ripped out element:", targetElement);
	if (!targetElement) break;
};

//#endregion

//#region DragAction

function DragAction() {
	/** @type {DragFunction} */
	this.execute = function(){};
	/** @type {DragFunction[]} */
	this.resizeFunctions = [
		function move(dialog, offset, d){ dialog.move(offset.startX + d.x, offset.startY + d.y); },
		function top(dialog, offset, d){ dialog.top = offset.startY + d.y; },
		function right(dialog, offset, d){ dialog.width = offset.width + d.x; },
		function bottom(dialog, offset, d){ dialog.height = offset.height + d.y; },
		function left(dialog, offset, d){ dialog.left = offset.startX + d.x; },
		function topLeft(dialog, offset, d){ dialog.top = offset.startY + d.y; dialog.left = offset.startX + d.x; },
		function topRight(dialog, offset, d){ dialog.width = offset.width + d.x; dialog.top = offset.startY + d.y; },
		function bottomRight(dialog, offset, d){ dialog.resize(offset.width + d.x, offset.height + d.y); },
		function bottomLeft(dialog, offset, d){ dialog.left = offset.startX + d.x; dialog.width = offset.width - d.x; dialog.height = offset.height + d.y; }
	];
}

/** @param {number} [direction] */
DragAction.prototype.set = function (direction) {
	this.execute = this.resizeFunctions[direction || 0] || function () {};
};

//#endregion

//#region DocumentCrawler

/** @param {HTMLDocument} [customDocument] */
function DocumentCrawler(customDocument){
	this.document = customDocument || document;
}

DocumentCrawler.prototype.getMetro = function () { return this.document.getElementById("metrobody"); };
DocumentCrawler.prototype.getMetroBody = function () { var metro = this.getMetro(); return metro && metro.firstChild; };
DocumentCrawler.prototype.getAllDialogs = function () { return this.document.getElementsByClassName("window"); };
DocumentCrawler.prototype.getDialogsContainer = function () { return this.document.getElementById("window-section"); };
DocumentCrawler.prototype.getOverlay = function () { return document.getElementById("overlay"); };
DocumentCrawler.prototype.getDesktop = function () { return document.getElementById("desktop"); };

//#endregion


//#region Event Listeners

window.addEventListener(supportsPointer? "pointermove" : "mousemove", ClickOffset.handleMouseDrag, false);
window.addEventListener("unload", function() { windowManager.saveState(); }, false);
window.addEventListener("dragover", function (e) { cancelDomEvent(e); }, false);
window.addEventListener("drop", function(e) {
  e.preventDefault();
  if (!e.dataTransfer) return;
  var files = e.dataTransfer.files;
  if (files.length > 0)
	 console.log("File dropped anywhere in window:", files[0].name);
}, false);

//#endregion

//#region Global Variables
var windowManager = new WindowManager;
window.windowManager = windowManager;
windowManager.isWindowUpdatesEnabled = true;
var bodyCrawler = new DocumentCrawler;

window.__LVMessengerReceive = messageReceived;
window.__LVMessenger = {};

//#endregion

/*\  The purpose is for this website to be functional on every browser that's less than or a decade old. I created my own polyfills for some functions that don't exist in ES5, so performance on ES6 browsers is expected to be better. Meow.
 * \  Tested and confirmed functional (can work on stuff I haven't tested too.):
 *  \  Chrome for Android Chrome targetting 36 and up.
 *   \  FireFox 115 ESR and up (should work on any version that's less than 10 years old, or at least has ES5 support (2009))
 *    \  Chromium 36 (That means Chrome, Edge Chromium, Brave, Opera, ...)
 *    /  ToDo: Test on Safari on macOS 10.7 Lion and 10.15 Catalina when I have time to do so. Same goes for Firefox and Chrome versions that I have installed on these systems. From the tests in Dialogs 8.1 I expect this to work fine!
 *   /  Internet Explorer 11 Trident + EdgeHTML 12-18 (Edge Legacy)
 *  /  Pale Moon 34
 * /  Safari 5+ (Windows and Mac OS X)
\*/
