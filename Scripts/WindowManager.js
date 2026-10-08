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

var isLocal = location.protocol === "file:" || location.hostname === "localhost";

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
	broadcastWindowMoves: true,
	_useTransform: useTransform,
	useAnimations: true,
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
	_useViewTransitionMaximize: true,
	get useViewTransitionMaximize() { return this._useViewTransitionMaximize; },
	set useViewTransitionMaximize(value) {

		if (value) this.compositorResize = false;
		this._useViewTransitionMaximize = value;
	},
	_useMica: false,
	get useMica() { return this._useMica; },
	set useMica(value) {
		if (!windowManager) return;
		windowManager.toggleMica(value);
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
	var regged = url.replace(/^[a-z]+:\/\/+/i, "").split("/")[0];
	return regged && regged.split("?")[0];
}

/** @param {string} url */
function getSiteName(url) {
	var domain = getDomain(url);
	if (!domain) return null;
	var parts = domain.split(".");
	var name = parts.length >= 2 ? parts[parts.length - 2] : parts[0];

	if (!name) return null;

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
 * @deprecated
 * @param {HTMLElement} element
 * @param {number} x
 * @param {number} y
 * @param {number} [skew]
 * @param {number} [scaleX]
 * @param {number} [scaleY]
 * @param {number} [rotation]
 */
function transformElementOld(element, x, y, skew, scaleX, scaleY, rotation) {
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

/** @param {HTMLElement} element @param {Transform} t */
function transformElement(element, t) {
	var transform = "";

	if (t.x && t.y) transform += "translate(" + toPixels(t.x) + "," + toPixels(t.y) + ")";

	// var transform = "translate(" + toPixels(transform.x) + "px," + Math.floor(transform.y) + "px)";
	if (t.skewX) transform += " skewX(" + toDegrees(t.skewX) + ")";
	if (t.scaleX === 1) t.scaleX = undefined;
	if (t.scaleY === 1) t.scaleY = undefined;
	if (t.scaleX && t.scaleY) transform += "scale(" + t.scaleX + "," + t.scaleY + ")";
	else if (t.scaleX) transform += "scaleX(" + t.scaleX + ")";
	else if (t.scaleY) transform += "scaleY(" + t.scaleY + ")";

	if (t.rotate) transform += "rotate(" + toDegrees(t.rotate) + ")";

	
	element.style.transform = transform;
}

/**
 * @param {HTMLElement} element
 * @param {number} top
 * @param {number} [left]
 * @param {number} [right]
 * @param {number} [bottom]
 */
function insetElement(element, top, left, right, bottom) {
	if ("inset" in element.style)
		if (typeof left === "undefined") element.style.inset = toPixels(top);
	else element.style.inset = toPixels(top) + " " + toPixels(right || 0) + " " + toPixels(bottom || 0) + " " + toPixels(left);
	else {
		if (typeof left === "undefined") left = top, right = top, bottom = top;
		element.style.top = toPixels(top);
		element.style.left = toPixels(left);
		if (typeof right !== "undefined") element.style.right = toPixels(right);
		if (typeof bottom !== "undefined") element.style.bottom = toPixels(bottom);
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

	if (source && windowManager) {

		var dialog = windowManager.windows[source];

		if (!dialog) return;

		if (type === "window-size") dialog.resizeBody(data.width, data.height); // Client dictates its size; window wraps around the client area.
		switch (type) {
			case "launchOverlay":
				var overlay = bodyCrawler.getOverlay();
				if (!overlay) break;

				overlay.ontransitionend = function () {
					if (!dialog) return;
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
				dialog.moveElementIntoPipById(data.id);
				break;
			case "visualizers":
				dialog.messageFrame("visualizers", windowManager.getVisualizerApps());
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
	var desktop = bodyCrawler.getDesktop();
	if (!desktop) return;
	desktop.toggleAttribute("flipped", enable); // Deprecated; moving to a class attribute.
	flipHandler(desktop.classList.toggle("flipped", enable));
}

/** @param {boolean} enable */
function flipHandler(enable){
	DesktopManager.toggleCharms(false);
	swapMetroBody();
	windowManager.flipped = enable;
	return windowManager.flipped;
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

function toPixels(/** @type {number} */value) { return Math.round(value) + "px"; }
function toPercent(/** @type {number} */value) { return Math.round(value * 100) + "%"; }
function toDegrees(/** @type {number} */value) { return Math.round(value) + "deg"; }

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

/**
 * @template {Record<string, any> | HTMLElement} [T=HTMLElement]
 * @param {HTMLElement} element
 * @param {(this: T) => void} [onToggled]
 * @param {(name: string) => boolean} [onTransitionEnd]
 * @param {(this: T) => void} [onEnd]
 * @param {T} [thisArg]
 * @param {number} [timeout]
 */
function animateElement(element, onToggled, onTransitionEnd, onEnd, thisArg, timeout) {
	/** @type {T} */
	// @ts-ignore
	var boundContext = thisArg || element;

	var callEnd = function() {
		// A superseded animation must not run its callback.
		if (!state.active) return;
		state.active = false;
		if (element._animationState === state) element._animationState = null;

		element.classList.remove("animating");
		if (onEnd) onEnd.call(boundContext);
	};

	// Cancel any animation still in flight on this element. The snap states share a
	// single element, so a leftover timer or listener would otherwise fire mid-transition
	// and undo the new one.
	var previous = element._animationState;
	if (previous) {
		if (previous.timer) clearTimeout(previous.timer);
		if (previous.frame) window.cancelAnimationFrame(previous.frame);
		if (previous.handler) element.removeEventListener(transitionEndEvent, previous.handler, false);
	}

	/** @type {{ timer: number, frame: number, handler: ((ev: TransitionEvent)=>void) | null, active: boolean }} */
	var state = element._animationState = { timer: 0, frame: 0, handler: null, active: true };

	if (!flags.useAnimations) {
		if (onToggled) onToggled.call(boundContext);
		callEnd();
		return;
	}

	state.timer = timeout && setTimeout(callEnd, timeout);

	if (supportsTransitions) {
		element.classList.add("animating");

		/** @type {(ev: TransitionEvent)=>void} */
		var animationHandler = function(event) {
			if (onTransitionEnd && !onTransitionEnd(event.propertyName)) return;

			console.log("Aborting animation over " + event.propertyName + ". Took: ", event.elapsedTime, "seconds. Reported by: ", event.target);

			element.removeEventListener(transitionEndEvent, animationHandler, false);
			clearTimeout(state.timer);
			callEnd();
		};

		state.handler = animationHandler;
		element.addEventListener(transitionEndEvent, animationHandler, false);
	}

	state.frame = window.requestAnimationFrame(function() {
		state.frame = 0;
		if (onToggled) onToggled.call(boundContext);
	});
}

//#endregion

//#region Window Manager

/**
 * @constructor
 * @class WindowManager
 */
function WindowManager() {
	/** @type {DialogMap} @const */
	this._windows = {};

	/** @type {DesktopState | null} */
	this._windowStates = null;

	this._isBlurEnabled = true;
	this._isMicaEnabled = false;
	this._isWindowUpdatesEnabled = false;

	this.isDragging = false;
	/** @const */
	this.dragAction = new DragAction;

	/**
	 * How close to the top edge a dragged window must be for aero snap to engage, in
	 * CSS pixels. Shared by the drag preview and the snap on drop, so the indicator
	 * cannot promise a snap the drop then refuses. 0 requires the very top edge.
	 * @type {number}
	 */
	this.snapFullThreshold = 30;

	/**
	 * How close to the left or right edge the pointer must be for a dragged window to
	 * snap to that half, in CSS pixels. Shared by the drag preview and the snap on
	 * drop, for the same reason as {@link WindowManager#snapFullThreshold}.
	 * @type {number}
	 */
	this.snapSideThreshold = 30;

	/**
	 * How far below its grab point a full-height snapped window has to be pulled before
	 * it lets go, in CSS pixels. Sideways dragging keeps the state, so this is the only
	 * number that decides when the window drops back onto its own height.
	 * @type {number}
	 */
	this.heightSnapReleaseThreshold = 10;

	/**
	 * Width of a gap tile as a share of the window area. One gap matches one half-width
	 * window, so a lone window snapped right sits exactly in the right half.
	 * @type {number}
	 */
	this.snapGapWidth = 0.5;

	/**
	 * Whether snapping a window to a side inserts a gap tile to hold its position.
	 * With gaps on, a window snapped right sits flush against the right edge and a lone
	 * window keeps its own width, leaving the rest of the desktop free. Turn this off
	 * for a full tiling window manager: no gaps, and the last window absorbs the
	 * leftover width so the group always fills the area. @type {boolean}
	 */
	this.snapInsertGaps = true;

	/**
	 * The snap zone the indicator is currently showing, or "" for none. Shared by the
	 * drag preview and the snap on drop so the two cannot disagree.
	 * @type {"" | "maximize" | "left" | "right" | "height"}
	 */
	this._snapZone = "";

	/**
	 * Last pointer position during a drag, so the drop can decide the same zone the
	 * preview did once the pointer has gone.
	 * @type {Coord}
	 */
	this.pointerPosition = { x: 0, y: 0 };

	/**
	 * Set when a gesture lets go of a full-height snapped window by resizing it down,
	 * so the rest of that gesture claims no snap zone: a small pull off the edge would
	 * otherwise bounce straight back into full height on release. Cleared when the next
	 * gesture starts.
	 * @type {boolean}
	 */
	this._heightSnapReleased = false;

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

	/** @type {PointerEvent | MouseEvent | null} Newest drag event waiting for the next frame. */
	this._pendingDragEvent = null;

	this.flipped = false;


	/** @type {Dialog | null} */
	this.focusedDialog = null;

	/** @type {boolean} Set while applying a broadcast from another tab, so applying it never re-broadcasts (echo loop prevention). */
	this.synchronizing = false;

	this.channel = new BroadcastChannel('lvos');

	this.channel.onmessage = function(ev) {
		var data = ev.data;
		if (typeof data === "string") try { data = JSON.parse(data); } catch (ex) { return; }
		if (!data || typeof data !== "object" || typeof data.type !== "string") return;
		if (flags.verboseLogs) console.log("Got a broadcast from another tab!", data);
		windowManager.handleBroadcast(data.type, data.data, data.id);
	};

	/** @type {WindowManager} */
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

			var isTouch = "pointerType" in event && event.pointerType === "touch";

			// The drop in disableDialogDrag decides its snap zone from pointerPosition once
			// the pointer is already gone, so the last position of the gesture has to be
			// recorded here rather than down in the throttled call: pointerup outruns the
			// pending frame, and a touch flick that ends on an edge gets no further events
			// to catch the recorded position up again.
			self.setPointerPosition(event.clientX, event.clientY);

			if (flags.updateRateLimit) {
				// Keep the newest event instead of discarding the ones that arrive while a
				// frame is pending, or the gesture's final position is never dragged at all.
				self._pendingDragEvent = event;
				if (self.ticking) return;
				self.ticking = true;
				window.requestAnimationFrame(function() {
					var pending = self._pendingDragEvent;
					self._pendingDragEvent = null;
					self.ticking = false;
					if (!pending) return;
					var touch = "pointerType" in pending && pending.pointerType === "touch";
					windowManager.handleWindowDrag(pending.clientX, pending.clientY, touch);
				});
			} else windowManager.handleWindowDrag(event.clientX, event.clientY, isTouch);
		} catch (ex) {
			console.error(ex);
		}
	};

	this.windowSnap = new WindowSnap;

	/** @type {WindowGroup} */
	this.windowGroup = { windows: [] };

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
		for (var id in this.windows) {
			var window = this.windows[id];
			if (window) state[id] = window.getState();
		}
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
	 /**
     * @this {WindowManager}
     */
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
	for (var id in this.windows) if (this.windows.hasOwnProperty(id)) {
		var dialog = this.windows[id];
		if (dialog) callback(dialog, id);
	}
};

WindowManager.prototype.killAll = function () {
	this.forEachWindow(function (dialog) { dialog.kill(); });
};

WindowManager.prototype.synchronizeStates = function () {
	this.forEachWindow(function(dialog) { dialog.reportState(); });
};

/** @param {Application | HTMLElement} app */
WindowManager.prototype.loadApp = function(app) {
	try {
		var dialog = new Dialog(app);
		dialog.mica = this.isMicaEnabled || false;
		this._windows[app.id] = dialog;
		if (!(app instanceof HTMLElement)) appManager.addApp(app);
	} catch(ex) { console.warn("App load failed", ex); }
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
		title: title || getSiteName(url) || "unkle"
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
	this.installApp(proxyUrl + url, getSiteName(url) || "unkle", "custom." + getDomain(url), getFaviconUrl(url));
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
	var window = windowManager.windows[appId];
	if (window) window.kill();
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

/** @param {Dialog} dialog */
WindowManager.prototype.focusDialog = function(dialog) {
	if (this.focusedDialog !== null && this.focusedDialog.target)
		this.focusedDialog.target.removeAttribute("focus");
	if (dialog.target) dialog.target.setAttribute("focus", String(true));
	this.focusedDialog = dialog;
};


WindowManager.prototype.activeDialogToMetro = function() { if (this.activeDialog) this.activeDialog.exportDialogBodyToMetro(); };

WindowManager.prototype.initializeDialogs = function() {
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

	// document.body.document.body.appendChild(this.windowSnap);
	this.windowSnap.init();
};

/**
 * Activates the window on which the provided event was fired.
 * @param {MouseEvent | PointerEvent} event
 * @param {Dialog} dialog
 * @param {number} [id]
 */
WindowManager.prototype.windowActivationEvent = function(event, dialog, id) {
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
	this.isTouchDrag = event && "pointerType" in event && event.pointerType === "touch";
	this.enableDialogDrag();
	// Default a window grab to a move; the sizer handler overrides this with a
	// resize direction right after, so a stuck resize can never hijack dragging.
	this.dragAction.set(id || 0);
	dialog.setClickOffset(event.clientX, event.clientY);
	dialog.activate();
	if (this.isTouchDrag) this.windowSnap.moveToDialog(dialog, 0, this.dragAction.direction, false, this.isTouchDrag);
	this._snapZone = "";
	this._heightSnapReleased = false;
	return dialog;
};


/**
 * @param {number} newX
 * @param {number} newY
 * @param {boolean} [isTouch]
 */
WindowManager.prototype.handleWindowDrag = function(newX, newY, isTouch) {
	var dialog = this.activeDialog;
	if (!dialog || !dialog.clickOffset) return;

	// Both maximized and tiled windows are drawn in a frame of their own while their
	// x/y/width/height still hold the floating geometry underneath. The grab point was
	// recorded against that drawn frame, so remap it into the floating geometry before
	// dragging or the window jumps away from the cursor.
	if (dialog.maximized) {
		if (!flags.aeroSnap) return;
		dialog.remapClickOffset(0, 0, this.snapWidth(), this.snapHeight());
		dialog.maximized = false;
	} else if (dialog.snapped) {
		var frame = dialog._snapFrame;
		if (frame) dialog.remapClickOffset(frame.x, frame.y, frame.width, frame.height);
		this.unsnapDialog(dialog);
	}

	/** @type {Coord} */
	var difference = { x: newX - dialog.clickOffset.clickX, y: newY - dialog.clickOffset.clickY };

	// Full-height snap only lets go when the window itself is pulled back down, or when
	// a top/bottom (or corner) resize takes its edge away from the screen: sideways
	// dragging is what the state exists for, so neither may put it into a tile group
	// behind the state's back. A move needs a real pull — a resize that grew the window
	// to this point has a large downward difference of its own. A resize that leaves
	// adopts the drawn full height as the window's real geometry first, so it continues
	// from what the user is holding rather than from the size stored underneath the CSS
	// layer, and re-records the grab against that frame.
	if (dialog.heightSnapped) {
		var gestureDirection = this.dragAction.direction;
		if (gestureDirection === 0) {
			if (difference.y > this.heightSnapReleaseThreshold) dialog.toggleHeightSnapped(false);
		} else if (this.isVerticalResizeDirection(gestureDirection)) {
			this.leaveHeightSnappedByResize(dialog);
		}
	}

	dialog.stopAnimating();

	this.dragAction.execute(dialog, dialog.clickOffset, difference);

	// Remember where the pointer was: the drop in disableDialogDrag happens after the
	// pointer is gone and must still decide the same zone.
	this.setPointerPosition(newX, newY);

	var snapZone = this.getGestureSnapZone(dialog, this.dragAction.direction, newX, newY);

	if (snapZone) {
		// snap() early-outs on an unchanged zone, so only the transition needs guarding:
		// leaving a zone must put the indicator back behind the window exactly once.
		if (snapZone !== this._snapZone) {
			if (this._snapZone) this.windowSnap.hideBehind(dialog, !!isTouch);
			this._snapZone = snapZone;
			this.windowSnap.snap(snapZone, dialog);
		}
	} else if (this._snapZone) {
		this._snapZone = "";
		this.windowSnap.hideBehind(dialog, !!isTouch);
	} else if (isTouch) {
		// Only a touch drag tracks the window. A mouse drag leaves the indicator
		// hidden; snapping is the one thing that reveals it for mouse input.
		this.windowSnap.moveToDialog(dialog, 20, this.dragAction.direction, true, true);
	}
	
	if (dialog.moveEvents && dialog.exchangeDialogMoveEvent) dialog.exchangeDialogMoveEvent(difference);
};

/**
 * Which aero snap zone the pointer is currently in, or "" for none. The pointer
 * decides, not the window's edges, so a window stays left-aligned no matter which way
 * it was dragged until the pointer itself reaches an edge.
 *
 * Sides are checked before maximize so the corners resolve to a side: both zones
 * overlap there, and half a screen is the more useful thing to offer.
 * @param {number} x Pointer position.
 * @param {number} y Pointer position.
 * @returns {"" | "maximize" | "left" | "right"}
 */
WindowManager.prototype.getSnapZone = function (x, y) {
	// Sides are tested first so a corner resolves to the side rather than maximize:
	// the corner is inside both zones, and half a screen is the more specific offer.
	if (x <= this.snapSideThreshold) return "left";
	if (x >= this.snapWidth() - this.snapSideThreshold) return "right";
	if (y <= this.snapFullThreshold) return "maximize";

	return "";
};

/**
 * Whether a drag direction is a resize that moves a vertical edge — top, bottom, or
 * any corner. Those are the gestures that can take a full-height snapped window's edge
 * away from the screen, which is how it lets go of the state.
 * @param {number} direction
 */
WindowManager.prototype.isVerticalResizeDirection = function (direction) {
	return direction === 1 || direction === 3 || direction === 5 || direction === 6 || direction === 7 || direction === 8;
};

/**
 * Lets go of a full-height snapped window by adopting the frame it is drawn at as its
 * real geometry, so a top/bottom resize continues from what the user is holding rather
 * than from the size stored underneath the CSS layer.
 *
 * The class comes off synchronously: move()/resize() pin against it, and an animated
 * exit would leave the CSS layer overriding the geometry the resize is about to write.
 * The grab is re-recorded against the adopted frame: pointerdown measured the offset
 * against the floating height, which is not the edge the user has hold of.
 * @param {Dialog} dialog
 */
WindowManager.prototype.leaveHeightSnappedByResize = function (dialog) {
	var drawnHeight = this.snapHeight();
	if (dialog.target) setClass(dialog.target, "height-snapped", false);
	dialog._snappingOut = false;
	dialog._snappingOutState = null;
	this._heightSnapReleased = true;

	dialog._y = 0;
	dialog._height = drawnHeight;
	dialog.updatePosition();
	dialog.updateHeight();

	var offset = dialog.clickOffset;
	if (offset) {
		offset.height = dialog.height;
		offset.startX = dialog.x;
		offset.startY = dialog.y;
	}
};

/**
 * The aero snap zone the current gesture may use, or "" when it may not snap at all.
 * Shared by the drag preview and the drop so they can never disagree about it.
 *
 * resizeFunctions puts the top sizer at 1 and the bottom sizer at 3: the only two that
 * push a vertical edge toward the screen, which is where the full-height snap belongs.
 * They put up that offer and nothing else, and every other resize travels along an edge
 * instead of toward one, so a resize claims no zone at all — which is also what keeps
 * the top edge free for the offer instead of having it compete with maximize.
 *
 * A window that is already full-height snapped owns its gesture: sideways dragging is
 * what the state exists for, so neither the indicator nor the drop may put it into a
 * tile group behind the state's back. A gesture that already let go of the state by
 * resizing claims nothing either, or a small pull off the edge would bounce straight
 * back into full height on release.
 * @param {Dialog} dialog
 * @param {number} direction The gesture's drag direction, read before it is reset.
 *   Only ever unset before a gesture has set one, and an unset direction claims nothing.
 * @param {number} x Pointer position.
 * @param {number} y Pointer position.
 * @returns {"" | "maximize" | "left" | "right" | "height"}
 */
WindowManager.prototype.getGestureSnapZone = function (dialog, direction, x, y) {
	if (!flags.aeroSnap || dialog.heightSnapped || this._heightSnapReleased) return "";

	if (direction === 1 || direction === 3) {
		var bounds = WindowManager.windowBounds;
		var threshold = this.snapFullThreshold;
		var atEdge = direction === 1 ?
			dialog.y <= bounds.top + threshold :
			dialog.y + dialog.height >= this.snapHeight() - threshold;
		return atEdge ? "height" : "";
	}

	if (direction !== 0) return "";

	return this.getSnapZone(x, y);
};

/** Width of the window area snaps lay out against. */
WindowManager.prototype.snapWidth = function () {
	var section = document.getElementById("window-section");
	return section ? section.clientWidth : window.innerWidth;
};

/** Height of the window area snaps lay out against. */
WindowManager.prototype.snapHeight = function () {
	var section = document.getElementById("window-section");
	return section ? section.clientHeight : window.innerHeight;
};

/** @param {number} x @param {number} y */
WindowManager.prototype.setPointerPosition = function (x, y) {
	this.pointerPosition.x = x;
	this.pointerPosition.y = y;
};

/**
 * Applies an aero snap zone to a window on drop.
 * @param {Dialog} dialog
 * @param {"" | "maximize" | "left" | "right" | "height"} zone
 */
WindowManager.prototype.snapDialog = function (dialog, zone) {
	// Same claim on the area as maximize, just the vertical half of it, so it takes the
	// window out of a tile group first for the same reason maximize does.
	if (zone === "height") {
		this.unsnapDialog(dialog);
		dialog.toggleHeightSnapped(true);
		return;
	}

	if (zone === "maximize") {
		this.unsnapDialog(dialog);
		dialog.maximize();
		return;
	}

	if (zone !== "left" && zone !== "right") return;
	this.tileDialog(dialog, zone);
};

/**
 * Adds a window to the snap group and redistributes the group's widths.
 * @param {Dialog} dialog
 * @param {"left" | "right"} side Which end of the group it joins.
 */
WindowManager.prototype.tileDialog = function (dialog, side) {
	var group = /** @type {WindowGroup} */ (this.windowGroup);
	var windows = /** @type {WindowTile[]} */ (group.windows);

	// Already tiled: the drop just reorders it, so leave its width alone.
	var index = this.findSnapTile(dialog.id);
	var tile = index === -1 ? { id: dialog.id, width: 0.5 } : windows[index];

	if (!tile) return;

	if (index !== -1) windows.splice(index, 1);

	if (side === "left") windows.unshift(tile);
	else windows.push(tile);

	if (this.snapInsertGaps) this.fitSnapGaps(windows, side);

	dialog.toggleSnapped(true);
	this.reflowSnapGroup();
};

/**
 * Keeps the group either fully tiled or, for a single window, held against the half it
 * was snapped into by a gap. Two windows already fill the area between them, so gaps
 * only ever exist while the group holds one.
 * @param {WindowTile[]} tiles
 * @param {"left" | "right"} [side] Which half the lone window is held in. Read from
 * the window's current offset when omitted.
 */
WindowManager.prototype.fitSnapGaps = function (tiles, side) {
	// Clear any gap left from when the group was smaller.
	for (var i = tiles.length - 1; i >= 0; i--) {
		var tile = tiles[i];
		if (tile && tile.gap) tiles.splice(i, 1);
	}

	if (tiles.length !== 1) return;
	var firstTile = tiles[0];
	if (!firstTile || !firstTile.id) return;
	var dialog = this.windows[firstTile.id];
	if (!side && dialog && dialog.target) side = parseFloat(dialog.target.style.getPropertyValue("--snap-x")) === 0 ? "left" : "right";

	// Opposite side: a window snapped right is held there by the gap on its left.
	tiles.splice(side === "right" ? 0 : 1, 0, { gap: true, width: this.snapGapWidth });
};

/**
 * Index of a window's tile in the snap group, or -1.
 * @param {string} id
 */
WindowManager.prototype.findSnapTile = function (id) {
	var windows = /** @type {WindowTile[]} */ (/** @type {WindowGroup} */ (this.windowGroup).windows);

	for (var i = 0; i < windows.length; i++) {
		var dialog = windows[i];
		if (dialog && dialog.id === id) return i;
	}

	return -1;
};

/**
 * Removes a window from the snap group, if it is in one.
 * @param {Dialog} dialog
 */
WindowManager.prototype.unsnapDialog = function (dialog) {
	var group = /** @type {WindowGroup} */ (this.windowGroup);
	var windows = /** @type {WindowTile[]} */ (group.windows);

	var index = this.findSnapTile(dialog.id);
	if (index === -1) return;

	windows.splice(index, 1);
	dialog.toggleSnapped(false);

	if (this.snapInsertGaps) this.fitSnapGaps(windows);

	this.reflowSnapGroup();
};

/**
 * Shares the window area out over the group's windows by width and writes each one's
 * share onto the element for the .snapped class to pick up.
 *
 * Every window takes its own width, and gap tiles only reserve space, so a lone tiled
 * window stays at 50% and leaves the rest of the desktop free to drag a second window
 * onto. Clear {@link WindowManager#snapInsertGaps} for a full tiling window manager:
 * no gaps are inserted and the last window soaks up whatever width is left over, so
 * the group always fills the area.
 */
WindowManager.prototype.reflowSnapGroup = function () {
	var windows = this.windowGroup.windows;

	if (!("length" in windows)) return;

	var areaWidth = this.snapWidth();
	var areaHeight = this.snapHeight();
	var remaining = 1;
	var offset = 0;

	var xOffset = 0;
	for (var i = 0; i < windows.length; i++) {
		var tile = windows[i];
		if (!tile || (typeof tile.id === "undefined")) continue;
		var isLast = i === windows.length - 1;
		// Only a gapless group gives its leftover width to the last window.
		var width = !this.snapInsertGaps && isLast ? remaining : (tile.width || 0.5);
		remaining -= width;

		// A gap only reserves space; it has no window to place.
		if (!tile.gap) {
			var dialog = this.windows[tile.id];
			if (dialog && dialog.target) {
				// Recorded in pixels as well, so a drag out of the group can remap the
				// grab point out of this frame without measuring the element.
				dialog._snapFrame = { x: offset * areaWidth, y: 0, width: width * areaWidth, height: areaHeight };

				dialog.target.style.setProperty("--snap-width", toPercent(width));
				dialog.target.style.setProperty("--snap-x", toPercent(xOffset));
				xOffset = width;
			}
		}

		offset += width;
	}
};

WindowManager.prototype.disableDialogDrag = function() {
	if (!this.isDragging) return;
	// if (flipped) return;
	// Read before set() below resets it to a plain move: the drop has to decide the same
	// zone the preview did, and the preview saw the direction the gesture started with.
	var dragDirection = this.dragAction.direction;
	this.dragAction.set();
	this.toggleDragging(false);
	this.saveState();
	if (!this.activeDialog) return;

	// Restore the touch drag scale before the snap applies. setDragScale runs its own
	// animation on the window element, and animateElement cancels whatever animation is
	// already in flight on that element — which is the pending class application from
	// toggleSnapped/toggleHeightSnapped below. With that rAF cancelled, the drop decides
	// the zone the indicator just offered and then leaves the window floating. Mouse
	// drags never change the scale, so this is a no-op for them.
	if (this.isTouchDrag) this.activeDialog.setDragScale(1, 1);

	var snapZone = this.getGestureSnapZone(this.activeDialog, dragDirection, this.pointerPosition.x, this.pointerPosition.y);
	if (snapZone) this.snapDialog(this.activeDialog, snapZone);

	if (this.isTouchDrag) {
		// this.windowSnap.moveToDialog(this.activeDialog, 0, this.dragAction.direction);
		this.windowSnap.hideBehind(this.activeDialog);
		this.isTouchDrag = false;
	}

	if (!this.activeDialog.maximized) this.windowSnap.hideBehind(this.activeDialog);
	this._snapZone = "";

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

/** @param {string} [id] */
WindowManager.prototype.getWindowById = function(id) {
	return id ? this.windows[id] : null;
};

/**
 * @param {MessageType} type
 * @param {*} [data]
 * @param {string} [id]
 */
WindowManager.prototype.broadcast = function(type, data, id) {
	LVMessenger.broadcast(this.channel, type, data, id);
}

/** Share the current theme with the other running OS instances. */
WindowManager.prototype.broadcastTheme = function() {
	if (!document.hasFocus()) return; // only the active tab drives theme sync
	this.broadcast("theme", { className: document.body.className });
}

/**
 * @param {MessageType} type
 * @param {*} [data]
 * @param {string} [id]
 */
WindowManager.prototype.handleBroadcast = function(type, data, id) {
	if (type === "theme") {
		var className = data && data.className;
		if (typeof className !== "string") return;
		// Follow the other instance's theme and let this instance's apps know too.
		document.body.className = className;
		this.forEachWindow(function(dialog) { dialog.messageFrame("theme", { className: className }); });
		return;
	}
	if (type !== "dialog-state") {
		// Non-window-state messages (e.g. iframe framing messages) are still forwarded
		// to the classic receive path.
		messageReceived(type, data, id);
		return;
	}
	if (!data || !id) return;

	var dialog = this.getWindowById(id);
	if (!dialog) {
		if (!appManager) return;
		var app = appManager.getApp(id);
		if (!app) return;
		this.loadApp(app);
		dialog = this.windows[id];
	}
	if (!dialog) return;
	this.synchronizing = false;
	try {
		// Full-state apply: covers open/close, geometry (move/resize), z-order and
		// maximized. loadState() (re)initializes the dialog so it gains a target
		// (a dialog registered by loadApp() alone has target === null); background
		// tabs never re-broadcast while synchronizing.
		dialog.loadState(data);
	} finally {
		// this.synchronizing = false;
	}
};

/**
 * @param {HTMLElement} el
 * @returns {Dialog | null}
 */
WindowManager.prototype.getWindowOwningElement = function(el) {
	var found = false;
	/** @type {Dialog | null} */
	var foundDialog = null;
	this.forEachWindow(function(dialog) {
		if (found) return;
		if (dialog.body === el) {
			found = true;
			foundDialog = dialog;
		}
	});
	return foundDialog;
};

/**
 * Gap the snap indicator keeps from every edge of the area it covers, so it reads as
 * floating over the desktop rather than filling it. Shared by the maximize and side
 * snap indicators so they stay consistent.
 * @type {number}
 */
WindowSnap.margin = 15;

function WindowSnap() {
	this.element = document.createElement("div");
	this.element.id = "window-snap";
	this._snapped = "";
	// Hidden from the moment it exists: it is an unpositioned, border-only box until the
	// first snap positions it, so without this the first drop flies it in from wherever
	// that box sat rather than from behind the window.
	this.element.classList.add("hidden");
}

Object.defineProperty(WindowSnap.prototype, "hidden", {
	get: function() { return this.element.classList.contains("hidden"); },
	set: function(enable) { if (enable) this.element.classList.add("hidden"); else this.element.classList.remove("hidden"); }
})

WindowSnap.prototype.init = function() {
	(document.getElementById("window-section") || document.body).appendChild(this.element);
};

/** @param {Dialog} dialog @param {number} [outset] @param {number} [direction] @param {boolean} [noAnimation] @param {boolean} [isTouch] */
WindowSnap.prototype.moveToDialog = function(dialog, outset, direction, noAnimation, isTouch) {
	outset = outset || 0;

	this.hidden = !outset;
	this._snapped = "";
	
	if (!direction) outset = 0;

	var sides = [
		{ top: true, right: true, bottom: true, left: true },
		{ top: true, right: false, bottom: false, left: false },
		{ top: false, right: true, bottom: false, left: false },
		{ top: false, right: false, bottom: true, left: false },
		{ top: false, right: false, bottom: false, left: true },
		{ top: true, right: false, bottom: false, left: true },
		{ top: true, right: true, bottom: false, left: false },
		{ top: false, right: true, bottom: true, left: false },
		{ top: false, right: false, bottom: true, left: true }
	];
	
	var s = sides[direction || 0] || sides[0];
	if (!s) return;
	var top = dialog.top - (s.top ? outset : 0);
	var left = dialog.left - (s.left ? outset : 0);
	var right = dialog.right - (s.right ? outset : 0);
	var bottom = dialog.bottom - (s.bottom ? outset : 0);

	this.element.style.zIndex = dialog.z.toString();

	this.hidden = false;
	// Direction 0 is a positional drag; the rest are resize handles, which stay at
	// scale 1.
	if (isTouch && !direction) dialog.setDragScale(0.9, 0.9);

	if (!noAnimation) animateElement(this.element, function() {
		this.applyInsetStyle(top, left, right, bottom);
	}, function(name) {
		return name === "inset";
	}, undefined, this, 200);
	else this.applyInsetStyle(top, left, right, bottom);
}

/**
 * @param {number} top
 * @param {number} [left]
 * @param {number} [right]
 * @param {number} [bottom]
 */
WindowSnap.prototype.applyInsetStyle = function(top, left, right, bottom) {
	insetElement(this.element, top, left, right, bottom);
}

/** @param {number} inset */
WindowSnap.prototype.setInset = function(inset) {
	insetElement(this.element, inset);
}

/** Width of the window area the indicator lays out against. */
WindowSnap.prototype.areaWidth = function() {
	var section = document.getElementById("window-section");
	return section ? section.clientWidth : window.innerWidth;
};

/**
 * Covers one half of the window area, held off every edge by the same margin the
 * maximize snap uses so both indicators read as the same kind of thing.
 * @param {"left" | "right"} side
 */
WindowSnap.prototype.setHalfInset = function(side) {
	var half = Math.round(this.areaWidth() / 2);
	var inset = WindowSnap.margin;
	insetElement(this.element, inset, side === "left" ? inset : half + inset, side === "left" ? half + inset : inset, inset);
}

/**
 * Frames the window at the full height of the area, held off the top and bottom by the
 * same margin every other indicator uses: the window's own shape stretched vertically,
 * which is exactly what the full-height snap is about to do to it. The sides are the
 * window's own edges pushed out by that same margin, so the frame reads as sitting just
 * outside the window rather than as the window itself.
 * @param {Dialog} [dialog]
 */
WindowSnap.prototype.setHeightInset = function(dialog) {
	if (!dialog) return;
	var inset = WindowSnap.margin;

	// Both sides measured from this element's own box, which spans the whole area.
	// dialog.right is a distance from the far edge rather than an x, so building the
	// right inset out of it sizes the frame off where the window sits instead of off how
	// wide it is; the window's right edge as a coordinate is x + width.
	var right = this.areaWidth() - dialog.x - dialog.width - inset;

	insetElement(this.element, inset,
		Math.max(inset, dialog.left - inset),
		Math.max(inset, right),
		inset);
};

/**
 * @param {"maximize" | "left" | "right" | "height"} type
 * @param {Dialog} [dialog] The window the offer is about, which the full-height
 *   indicator frames and the others only need for their z-order.
 */
WindowSnap.prototype.snap = function(type, dialog) {
	
	// this.element.style.transitionDuration = "300ms";
	if (type === this._snapped) return;
	this._snapped = type;
	
	this.hidden = false;
	// Over the window it is previewing. Without this the indicator keeps whatever
	// z-order the last window it was hidden behind left, and for a window below that
	// one it would sit behind the very thing it is meant to cover.
	if (dialog) this.element.style.zIndex = dialog.z.toString();

	animateElement(this.element, function() {

		console.log("snapping", type);

		switch(type) {
			case "maximize": this.setInset(WindowSnap.margin); break;
			case "left":
			case "right": this.setHalfInset(type); break;
			case "height": this.setHeightInset(dialog); break;
		}
	}, function(name) {
		return name === "inset";
	}, function() {
		// this.hidden = true;
	}, this, );
}

/**
 * @param {Dialog} dialog
 * @param {boolean} [keepScale] Skip the scale reset, for a touch drag still in progress.
 */
WindowSnap.prototype.hideBehind = function(dialog, keepScale) {
	// The window's drag scale is not the indicator's to hide, so it is restored before
	// anything else: a touch drag that ends behind an indicator already hidden would
	// otherwise never bring the window back to full size. A no-op when it is at 1 already.
	if (!keepScale) dialog.setDragScale(1, 1);

	// Already behind it. Revealing the indicator only to hide it again turns a drop that
	// offered nothing into a flash of it flying in from its last position, which is the
	// one thing this method exists to avoid.
	if (this.hidden) return;

	// noAnimation: this method already animates the element, and moveToDialog must not
	// start a competing animation on the same element or it cancels this one.
	animateElement(this.element, function() {

		this.moveToDialog(dialog, 0, undefined, true);
	}, function(name) {
		return name === "inset";
	}, function() {
		this.hidden = true;
	}, this, 120);
}

//#endregion

//#region ClickOffset

/**
 * @constructor
 * @class ClickOffset
 */
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
 * @param {HTMLElement | Application} [object] This is a dialog element from the HTML structure, or an object that defines the properties of the window.
 * @param {boolean} [create]
 *
 * @constructor
 * @class Dialog
 */
function Dialog(object, create) {

	/** @type {number} */
	this._x = 0;
	/** @type {number} */
	this._y = 0;
	/** @type {number} */
	this._z = 0;
	/** @type {number} */
	this._width = 0;
	/** @type {number} */
	this._height = 0;
	this._isMinWidth = false;
	this._isMinHeight = false;

	/** @type {Window | null} */
	this._popupWindow = null;

	/** @type {string| null} */
	this._src = null;

	this._loaded = false;

	this._previousX = 0;
	this._previousY = 0;
	this._minWidth = 200;
	this._minHeight = 200;
	this._maxWidth = 1000;
	this._maxHeight = 1000;
	this._minAspectRatio = 0;
	this._maxAspectRatio = Infinity;
	this._aspectRatio = 0;
	this._aspectRatioEnabled = false;
	this._constrainAspectRatioInner = false;
	this._constrainAspectRatioLine = false;
	this._mica = flags.useMica;

	this._useTransform = useTransform;
	this._useScale = useScale;

	this._skew = 0;
	this._scaleX = 0;
	this._scaleY = 0;
	this._rotation = 0;

	/** How long the touch-drag downscale animates for, in ms. Must match the transform transition in windows.css; after it elapses the drag stops animating. */
	this.dragScaleDuration = 280;
	/** @type {boolean} True while the touch-drag downscale is playing, so the drag handlers do not strip the "animating" class out from under it. */
	this._dragScaleAnimating = false;

	this._maximizing = false;
	this.maximizeAnimations = 0;

	// this._isLoa
	this.fixed = false;


	/** Tracks the persisted open/closed state. The isOpen property is backed by a CSS class that gets applied asynchronously in a requestAnimationFrame, so it cannot be used for saving state synchronously! */
	this._stateOpen = false;
	/** @const */
	this._bodyOffset = { width: 0, height: 0, x: 0, y: 0 };

	/** @type {{_fsTimeout: number | null, _fsRaf: number | null, _fsToken: number | null, _fsTokenAtStart: number | null }} @const */
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

	var appList = document.getElementById("applist");
	if (appList) appList.appendChild(this.createOpenButton());

	var metroAppList = document.getElementById("metroapplist");
	if (metroAppList) metroAppList.appendChild(this.createOpenButton());
	if (create || isElement(object)) this.initWithObject(object);

	this._popupPositionInterval = 0;

	this.dragging = false;

	/** @type {HTMLImageElement| null} */
	this._appIcon = null;

	var self = this;
	/** @param {MouseEvent | PointerEvent} ev @param {number} [id] */
	this.activationHandler = function (ev, id) {
		if (ev.target instanceof HTMLElement && ev.target.classList.contains("touch") && (!("pointerType" in ev) || ev.pointerType !== "touch"))
			return false;
		windowManager.windowActivationEvent(ev, self, id);
		return true;
	};
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
			if (!isDialog(object)) console.warn("This is not a dialog element");
			this.target = object;
			if (this.target.parentElement && this.target.parentElement.nodeName === "TEMPLATE") return;
			this.close();
		} else {
			this.application = object;

			if (object.exists) {
				this.target = document.getElementById(object.id);
				var doc = this.contentDocument;
				if (doc && doc.readyState !== "complete") this.openUrl(this.application.src);
			} else {
				this.target = createDialog();
				this.openUrl(object.src);
			}
			if (this.windowTarget) this.windowTarget.dialog = this;

			if (object.classes && typeof object.classes === "object"){
				object.classes.forEach(function (clazz) { this.target && this.target.classList.add(clazz); }, this); // `class` is a reserved keyword.
			}
			this.setTitle(object.title);
			this.fixed = object.fixed || false;
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
	/** @param {Coord} difference */
	this.exchangeDialogMoveEvent = function(difference) { // Fire-and-forget; keep window move as fast as possible.
		if (difference && self.clickOffset) this.messageFrame("windowMove", self.clickOffset.update(difference.x, difference.y));
	};

	var target = this.target;
	if (target && this.activationHandler) {
		var buttons = target.getElementsByTagName("button");

		var createSizers = true;

		if(this.resizable && createSizers) this._createSizers();

		target.addEventListener("dragstart", cancelDomEvent, false);
		target.addEventListener("selectstart", cancelDomEvent, false);

		var body = this.body;
		if (body) body.addEventListener("load", function () { try {
			self.verifyEjectCapability();
		} catch (exception) {
			console.warn("Failed to verify eject capability" + exception);
			if (buttons[0]) buttons[0].style.display = "none";
		}}, false);

		var header = this.titleBar;
		if (header)
			header.addEventListener("dblclick", this.toggleMaximized.bind(this, undefined), false);


		if (supportsPointer) target.addEventListener("pointerdown", this.activationHandler, false);
		else target.addEventListener("mousedown", this.activationHandler, false);

		var ejectButton = buttons[windowButtons.eject];
		if (ejectButton)
			ejectButton.addEventListener("click", this.eject.bind(this), false);

		var closeButton = buttons[windowButtons.close];
		if (closeButton)
			closeButton.addEventListener("click", this.close.bind(this), false);
		var fullscreenButton = buttons[windowButtons.full];
		if (fullscreenButton)
			fullscreenButton.addEventListener("click", this.toggleMaximized.bind(this, undefined), false);

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
	
	if (this.application && this.application.launch) this.launch();

	if (this.frame) this.frame.addEventListener("load", function() { self._loaded = true; });
};

/** @param {boolean} [createTouchSizers] */
Dialog.prototype._createSizers = function(createTouchSizers){
	var self = this;
	var target = this.target;

	if (typeof createTouchSizers === "undefined") createTouchSizers = supportsPointer;

	/**
	 * @this {Dialog}
	 * @param {number} id
	 */
	var createSizer = function (id) {
		if (!target || !self.activationHandler) return;

		var sizerId = "sizer-" + id;

		var sizer = self.getElementByTagOrClassName(sizerId);
		if (!sizer || !(isElement(sizer))) sizer = document.createElement("div");
		sizer.draggable = false;
		sizer.id = id.toString();
		sizer.classList.add(sizerId);
		/** @param {PointerEvent | MouseEvent} ev */
		var pointerDown = function (ev) {
			if (!self.activationHandler || !self.activationHandler(ev, id)) return;
			windowManager.dragAction.set(id);
			if (windowManager.isTouchDrag) windowManager.windowSnap.moveToDialog(self, 20, id);
			cancelDomEvent(ev);
		};
		var pointerUp = function () { windowManager.disableDialogDrag(); };
		if (supportsPointer) {
			sizer.onpointerdown = pointerDown;
			sizer.onpointerup = pointerUp;
			sizer.onpointercancel = pointerUp;
		}
		else sizer.onmousedown = pointerDown;
		target.appendChild(sizer);

		if (createTouchSizers) {
			var touchSizerId = "touch-sizer-" + id;

			var touchSizer = self.getElementByTagOrClassName(touchSizerId);
			if (!touchSizer || !isElement(touchSizer)) touchSizer = document.createElement("div");

			touchSizer.draggable = false;
			touchSizer.id = "touch-" + id;
			touchSizer.classList.add(touchSizerId);
			touchSizer.classList.add("touch");

			if (supportsPointer) {
				touchSizer.onpointerdown = pointerDown;
				touchSizer.onpointerup = pointerUp;
				touchSizer.onpointercancel = pointerUp;
			}

			target.appendChild(touchSizer);
		}
	};

	for (var i = 0; i < 8; i++) createSizer.call(this, i + 1);
};

Dialog.prototype.reportState = function() {
	this.messageFrame("window-size", {});
	this.messageFrame("theme", {className: document.body.className});
	windowManager.broadcastTheme();
};
/**
 * @param {boolean} [forceOpen]
 * @param {boolean} [kill]
 */
Dialog.prototype.toggleOpen = function (forceOpen, kill) {
	var target = this.target;
	if (!target) return;
	var self = this;
	var wasOpen = this._stateOpen;
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
	if (wasOpen !== this._stateOpen) this.broadcastState({ open: this._stateOpen === true });
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
Object.defineProperty(Dialog.prototype, "isOpen", {
	get: function() { return Boolean(this.target && this.target.classList.contains("open")); },
	set: function(open) { this.toggleOpen(open); }
});
Object.defineProperty(Dialog.prototype, "frame", {
	get: function() { return this.target && this.target.getElementsByTagName("iframe")[0] || null; }
});
Object.defineProperty(Dialog.prototype, "resizable", {
	get: function() { return !this.application ? true : this.application.resizable !== false; },
	set: function(v) { if (v) this._createSizers(); }
})
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
		return frame && frame.contentDocument;
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
		return this._x * window.innerWidth; // TODO: get ehe window bounds calculated on resize evt
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

/**
 * The target width/height ratio that the window is constrained to when
 * {@link Dialog#constrainAspectRatio} is enabled. 0 (or a non-positive value) means no constraint.
 */
Object.defineProperty(Dialog.prototype, "aspectRatioConstraint", {
	get: function() { return this._aspectRatio; },
	set: function(aspect) { this._aspectRatio = typeof aspect === "number" && aspect > 0 ? aspect : 0; }
});

/**
 * Whether the window's {@link Dialog#aspectRatioConstraint} should be enforced by
 * {@link Dialog#resize}. When enabled, resizing always keeps the window at the constraint ratio.
 */
Object.defineProperty(Dialog.prototype, "constrainAspectRatio", {
	get: function() { return this._aspectRatioEnabled; },
	set: function(enabled) {
		if (!this._aspectRatio) this._aspectRatio = this.aspectRatio;
		this._aspectRatioEnabled = !!enabled;
	}
});

/**
 * Selects how corner resizes behave when {@link Dialog#constrainAspectRatio} is enabled. The axis
 * that is locked switches automatically based on which side of the corner's diagonal (the aspect
 * ratio line) the mouse is on, so the resize stays a proper right angle instead of a single axis.
 * - `true` (inner / L shape): locks the SMALLER axis, so the window hugs the corner under the mouse.
 * - `false` (outer / V shape, default): locks the LARGER axis, so the mouse goes away from the window.
 */
Object.defineProperty(Dialog.prototype, "constrainAspectRatioInner", {
	get: function() { return this._constrainAspectRatioInner; },
	set: function(enabled) { this._constrainAspectRatioInner = !!enabled; }
});

/**
 * Forces corner resizes (when {@link Dialog#constrainAspectRatio} is enabled) to keep the dragged
 * corner on a straight line, instead of snapping between the L (inner) and V (outer) axis paths.
 * The dragged corner is pinned to the window's own diagonal and the size follows the cursor's
 * projection onto that diagonal, so it scales along a straight path in between the other modes.
 */
Object.defineProperty(Dialog.prototype, "constrainAspectRatioLine", {
	get: function() { return this._constrainAspectRatioLine; },
	set: function(enabled) { this._constrainAspectRatioLine = !!enabled; }
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
		var bounds = WindowManager.windowBounds;
		var bottom = this.bottomFromTop;
		if (bounds.bottom !== Infinity && bottom >= bounds.bottom - 0.5) bottom = bounds.bottom;
		if (top < bounds.top) top = bounds.top;
		var height = Math.max(Math.min(bottom - top, this.maxHeight), this.minHeight);
		top = bottom - height;
		this._height = height;
		this._y = top / window.innerHeight;
		if (this.useTransform) {
			if (this.target) this.target.style.height = toPixels(height);
			if (this.useTransform) this.updateTransform();
		} else this.setInset(top, this.left, this.right, window.innerHeight - bottom);
		this._isMinHeight = height === this.minHeight;
	}
});

Object.defineProperty(Dialog.prototype, "left", {
	get: function() { return this.x; },
	set: function(left) {
		var bounds = WindowManager.windowBounds;
		var right = this.rightFromLeft;
		if (bounds.right !== Infinity && right >= bounds.right - 0.5) right = bounds.right;
		if (left < bounds.left) left = bounds.left;
		var width = Math.max(Math.min(right - left, this.maxWidth), this.minWidth);
		left = right - width;
		this._width = width;
		this._x = left / window.innerWidth;
		if (this.useTransform) {
			if (this.target) this.target.style.width = toPixels(width);
			if (this.useTransform) this.updateTransform();
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
			var bounds = WindowManager.windowBounds;
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
			var bounds = WindowManager.windowBounds;
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

Object.defineProperty(Dialog.prototype, "snapped", {
	get: function() {
		if (!this.target) return false;
		return this.target.classList.contains("snapped");
	},
	set: function(snapped) { this.toggleSnapped(snapped); }
});

Object.defineProperty(Dialog.prototype, "heightSnapped", {
	get: function() {
		if (!this.target) return false;
		return this.target.classList.contains("height-snapped");
	},
	set: function(snapped) { this.toggleHeightSnapped(snapped); }
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
	get: function() { return this._id || (this.target && this.target.id) || "unk"; },
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
		try { // TODO: cache the element so it doesn't have to be re-fetched each time! add _micaElement to the dialog thing as an optional prop
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
	var header = this.titleBar;
	if (!header) return;
	this._appIcon = header.getElementsByTagName("img")[0] || null;
	if (!this._appIcon) return;

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
			this.updateTransform();
	else if (this.target) skewElement(this.target, skew);
};
/**
 * @param {number} [scaleX]
 * @param {number} [scaleY]
 * @param {boolean} [update]
 * @param {boolean} [noAnimation]
 */
Dialog.prototype.setScale = function(scaleX, scaleY, update, noAnimation) {
	this._scaleX = scaleX || 1;
	this._scaleY = scaleY || 1;
	if (update === false) return;

	if (noAnimation !== false) this.animate(function() {
		this.updateTransform();
	});
	else this.updateTransform();
};
/**
 * Scales the window for a touch drag. A change of scale animates over
 * {@link Dialog#dragScaleDuration}, in either direction; once it has run, the rest of
 * the drag moves the window without a transition. The duration is a fallback: while the
 * finger moves, the window's own transform keeps re-targeting the transition, so
 * transitionend may never arrive on its own.
 * @param {number} [scaleX]
 * @param {number} [scaleY]
 */
Dialog.prototype.setDragScale = function(scaleX, scaleY) {
	var self = this;
	var nextX = scaleX || 1;
	var nextY = scaleY || 1;

	// Already at this scale, or an animation is still playing and must not be restarted.
	if (nextX === this._scaleX && nextY === this._scaleY) return;
	if (this._dragScaleAnimating) {
		this.setScale(nextX, nextY, undefined, false);
		return;
	}

	this._dragScaleAnimating = true;
	this.animate(function() {
		this.updateTransform();
	}, function(name) {
		return name === "transform";
	}, function() {
		self._dragScaleAnimating = false;
	}, this.dragScaleDuration);
	this._scaleX = nextX;
	this._scaleY = nextY;
};
/** @param {number} scaleX */
Dialog.prototype.setScaleX = function(scaleX) {
	this._scaleX = scaleX;
	this.updateTransform();
};
/** @param {number} scaleY */
Dialog.prototype.setScaleY = function(scaleY) {
	this._scaleY = scaleY;
	this.updateTransform();
};
/** @param {number} rotation */
Dialog.prototype.setRotation = function(rotation) {
	this._rotation = rotation;
	this.updateTransform();
};


Dialog.prototype.focus = function() { windowManager.focusDialog(this); };
Dialog.prototype.activate = function() {
	this.focus();
	this.setZ();
	this.messageFrame("open");
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

/**
 * Moves the grab point out of the frame the window is currently drawn in and into its
 * own floating geometry, which is where x/y/width/height have been pointing all along.
 * Without this, dragging a maximized or tiled window moves it by the difference between
 * the two frames and it slides out from under the cursor.
 * @param {number} frameX Left edge of the drawn frame.
 * @param {number} frameY Top edge of the drawn frame.
 * @param {number} frameWidth Width of the drawn frame.
 * @param {number} frameHeight Height of the drawn frame.
 */
Dialog.prototype.remapClickOffset = function (frameX, frameY, frameWidth, frameHeight) {
	var offset = this.clickOffset;
	if (!offset || frameWidth <= 0 || frameHeight <= 0) return;

	offset.clickX = this.x + (offset.clickX - frameX) * (this.width / frameWidth);
	offset.clickY = this.y + (offset.clickY - frameY) * (this.height / frameHeight);
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
	if (!button) return enable;
	if (typeof enable === "undefined") enable = button.disabled;
	return button.disabled = !enable;
};


Dialog.prototype.stopAnimating = function () {
	// The drag scale-down relies on "animating" to play its transition. Drag handlers
	// call this on every pointermove to cancel the window's own animations, which would
	// otherwise kill that transition after a single frame. Snapping out is exempt for
	// the same reason: it is the drag itself that starts it.
	if (this._snappingOut) {
		// An animation that supersedes this one never runs its onEnd, so the flag would
		// otherwise stay set and keep stopAnimating switched off for the rest of the
		// window's life. Release it as soon as the element is owned by something else.
		if (this.target && this.target._animationState !== this._snappingOutState) {
			this._snappingOut = false;
			this._snappingOutState = null;
		}
		return;
	}
	if (this._dragScaleAnimating) return;
	if (this.target) this.target.classList.remove("animating");
};

/**
 * @param {(this:Dialog)=>void} [onToggled]
 * @param {(name:string)=>boolean} [onTransitionEnd]
 * @param {(this:Dialog)=>void} [onEnd]
 * @param {number} [timeout]
 */
Dialog.prototype.animate = function (onToggled, onTransitionEnd, onEnd, timeout) {
	var element = this.target;
	if (element) animateElement(element, onToggled, onTransitionEnd, onEnd, this, timeout);
};
/**
 * @param {string} className
 * @param {boolean} [force]
 * @param {(name:string)=>boolean} [onTransitionEnd]
 * @param {(this:Dialog,enabled:boolean)=>void} [onEnd]
 * @param {(this:Dialog,enabled:boolean)=>void} [onToggled]
 * @param {number} [timeout] Safety net: a property whose transition keeps being
 * restarted never fires transitionend, so without this the animation can hang with
 * `animating` still on the element.
 */
Dialog.prototype.toggleClassAnimated = function (className, force, onTransitionEnd, onEnd, onToggled, timeout) {
	var self = this;
	var enabled = false;
	this.animate(function() {
		if (self.target) enabled = setClass(self.target, className, force);
		if (onToggled) onToggled.call(self, enabled);
	}, onTransitionEnd, function() { if (onEnd) onEnd.call(self, enabled); }, timeout);
};

/**
 * Tiled state, the sibling of maximized: purely visual, so the window keeps its own
 * width/height/position and returns to them untouched when it leaves the group.
 *
 * Animated through the same toggleClassAnimated path maximizing uses, so tiling gets
 * the identical transition rather than a second implementation of it.
 * @param {boolean} [enable]
 */
Dialog.prototype.toggleSnapped = function (enable) {
	var target = this.target;
	if (!target) return;
	if (enable == null) enable = !target.classList.contains("snapped");
	if (target.classList.contains("snapped") === enable) return;

	// Leaving the group has to survive the drag's own animation cancelling, so it is
	// exempt from stopAnimating the same way the drag scale-down already is. Without
	// this the window drops to floating in one frame instead of easing out, because the
	// next pointermove cancels the transition.
	this._snappingOut = !enable;
	this._snappingOutState = null;

	this.toggleClassAnimated("snapped", enable, function (name) {
		// transform only. left holds at 0 and never animates any more, and ending on
		// width would cut the animation off at a fixed 280ms while a drag is still
		// restarting transform, jumping the window to the cursor. Letting transform
		// settle means it lands under the cursor instead; the timeout is the backstop
		// for a drag that never pauses long enough for that.
		return name === "transform";
	}, function (isSnapped) {
		this._snappingOut = false;
		this._snappingOutState = null;

		// Cleared only once the window has finished shrinking back, or it would jump to
		// its floating size in a single frame.
		if (isSnapped || !target) return;
		target.style.removeProperty("--snap-width");
		target.style.removeProperty("--snap-x");
	}, function () {
		// Required, not optional: toggleClassAnimated only calls setClass from this
		// callback, so omitting it means the class is never applied at all.
	}, 1000);

	// Which animation owns the element, so stopAnimating can tell this one from the
	// drag scale-down that may supersede it and never run the onEnd above.
	this._snappingOutState = target._animationState;
};

/**
 * Full-height snap, the state that is neither tiled nor maximized: the window paints
 * edge to edge vertically and keeps only its width and x as its own, so it can still be
 * dragged sideways. A top or bottom resize whose edge reaches the screen puts the
 * offer up, dropping the window there enters it, and pulling it back down leaves it.
 *
 * The height is a CSS layer, exactly like maximizing: _height is never written, so it
 * still holds the size the window had when the state was entered and hands it straight
 * back when the class goes. y is the opposite — the drawn frame starts at the top of the
 * area, so y is pinned there too, otherwise the grab would be recorded against one frame
 * and the window drawn in another and every sideways drag would walk it off its full
 * height. Only x is left alone, which is what the sideways drag is free to change.
 *
 * Animated through the same toggleClassAnimated path tiling uses, so entering and
 * leaving get the identical transition rather than a second implementation of it.
 * @param {boolean} [enable]
 */
Dialog.prototype.toggleHeightSnapped = function (enable) {
	var target = this.target;
	if (!target) return;
	if (enable == null) enable = !target.classList.contains("height-snapped");
	if (target.classList.contains("height-snapped") === enable) return;

	// Before the class goes on: while it is off, move() still takes the y it is handed.
	if (enable) this.move(this.x, 0);

	// Leaving is started from a drag, whose very next pointermove strips .animating, so
	// the way out has to be exempt from stopAnimating the same way leaving a tile group
	// already is. Without this the window drops to its floating height in one frame.
	this._snappingOut = !enable;
	this._snappingOutState = null;

	this.toggleClassAnimated("height-snapped", enable, function (name) {
		// The frame moves on height and the y it pins to on transform. Either settling
		// means the state has arrived; ending only on transform would hang on a window
		// that already sat at the top and so never moved it.
		return name === "height" || name === "transform";
	}, function () {
		this._snappingOut = false;
		this._snappingOutState = null;
	}, undefined, 1000);

	// Which animation owns the element, so stopAnimating can tell this one from the
	// drag scale-down that may supersede it and never run the onEnd above.
	this._snappingOutState = /** @type {any} */ (target)._animationState;
};

/** @param {boolean} enable */
Dialog.prototype.toggleMaximized = function (enable) {

	if (enable == null) enable = !this.maximized;
	if (this.maximized === enable) return;
	if (!this.target) return;

	// Maximized and tiled both claim the whole area, so they cannot overlap. Full-height
	// snap claims the vertical half of it, and the grab point for maximizing is recorded
	// against the maximized frame, so it has to go before the geometry is remapped.
	if (enable && this.snapped && windowManager) windowManager.unsnapDialog(this);
	if (enable && this.heightSnapped) this.toggleHeightSnapped(false);

	var self = this;
	var content = this.content;

	this.setZ();

	// Only the active tab broadcasts; background tabs apply (guarded by focus + synchronizing).
	this.broadcastState({ maximized: enable === true });

	this.maximizeAnimations++;
	if (flags.useViewTransitionMaximize && this.windowTarget)
		return this.windowTarget.toggleMaximizedVT(enable);

	if (supportsTransitions) !flags.compositorResize ? this.toggleClassAnimated("maximized", enable, function(name) {
		return name === "transform" || name === "width";
	}, undefined, function(isMaximized) {
		if (this.useTransform && this.target) this.toggleMinSizeConstraints(isMaximized);
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
		transformElementOld(content, 0, 0, 0, 1, 1);
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

		target.style.transformOrigin = enabled ? "top left" : "";
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

				transformElementOld(content, 0, 0, 0, 1 / scaleX, 1 / scaleY);
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
// frat
/**
 * @param {MessageType} type
 * @param {*} [message]
 */
Dialog.prototype.messageFrame = function (type, message) {
	var frame = this.frame;
	if (frame) LVMessenger.broadcastToChild(type, frame, message);
};
Dialog.prototype.updateTransform = function () {
	if (this.useTransform && this.target) transformElementOld(this.target, this._maximizing ? 0 : this.x, this._maximizing ? 0 : this.y, this._skew, this._scaleX, this._scaleY, this._rotation);
};
Dialog.prototype.updatePosition = function() {
	if (!this.target) return;
	if (this.useTransform) this.updateTransform();
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
		transformElementOld(backdrop, -this.x, -this.y);

		var wallpaperWidth = wallpaperImage instanceof HTMLImageElement && wallpaperImage.clientWidth ? wallpaperImage.clientWidth : wallpaperP.clientWidth;
		var wallpaperHeight = wallpaperImage instanceof HTMLImageElement && wallpaperImage.clientHeight ? wallpaperImage.clientHeight : wallpaperP.clientHeight;

		backdrop.style.width = toPixels(wallpaperWidth);
		backdrop.style.height = toPixels(wallpaperHeight);
	} catch(ex) { console.warn(ex); }
};
/**
 * Broadcasts this window's state change to other tabs through the window manager.
 * When a partial is given, exactly those changed fields are sent (a move emits only
 * {x,y}, maximize only {maximized}, etc.); when omitted, the full DialogState snapshot
 * is sent. Only the active tab broadcasts; background tabs only listen and apply
 * (guarded by focus, so applying never echoes back).
 * @param {Partial<DialogState>} [overrides] The state fields that actually changed.
 */
Dialog.prototype.broadcastState = function (overrides) {
	if (!windowManager || !flags.broadcastWindowMoves || !document.hasFocus()) return;
	if (!this.id) return;
	windowManager.broadcast("dialog-state", overrides || this.getState(), this.id);
};

/**
 * @param {number} [x]
 * @param {number} [y]
 * @param {boolean} [update]
 * @param {boolean} [animate]
 */
Dialog.prototype.move = function (x, y, update, animate) {
	if (this.fixed) return;
	if (flags.useSkewAnimations) {
		this._previousX = this.x;
		this._previousY = this.y;
	}
	if (typeof x === "undefined" || x === null) x = this.x;
	if (typeof y === "undefined" || y === null) y = this.y;
	// Full-height snap pins the window vertically: sideways dragging is all it allows,
	// so y keeps holding the top edge it was entered from and the drop finds it there.
	if (this.heightSnapped) y = this.y;
	var bounds = WindowManager.windowBounds;
	if (x < bounds.left) x = bounds.left;
	if (bounds.right !== Infinity && x > bounds.right - this.width) x = bounds.right - this.width;
	if (y < bounds.top) y = bounds.top;
	if (bounds.bottom !== Infinity && y > bounds.bottom - this.height) y = bounds.bottom - this.height;
	var windowWidth = window.innerWidth;
	var windowHeight = window.innerHeight;
	var previousX = this._x, previousY = this._y;
	this._x = x / windowWidth;
	this._y = y / windowHeight;

	if (update !== false) {
		if (animate) this.animate(this.updatePosition);
		else this.updatePosition();
	}

	if (previousX !== this._x || previousY !== this._y) {
		var state = {};
		if (previousX !== this._x) state.x = this.x;
		if (previousY !== this._y) state.y = this.y;
		this.broadcastState(state);
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
	if (this.fixed) return;
	var previous = this._z;
	if (typeof z === "undefined") {
		if (this._z !== windowManager.topZ) this._z = ++windowManager.topZ;
	} else this._z = z;
	if (isElement(this.target))
		this.target.style.zIndex = String(this._z);
	if (previous !== this._z) this.broadcastState({ z: this._z });
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

	var bounds = WindowManager.windowBounds;

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

	var bounds = WindowManager.windowBounds;

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
 * Which handle of the window a resize is being performed by. Used both to keep the
 * opposite edges fixed in place while resizing and to enforce the aspect-ratio constraint.
 * @typedef {"bottom-right"|"bottom-left"|"top-right"|"top-left"|"bottom"|"right"|"top"|"left"} ResizeDirection
 */

/**
 * @param {number} [width]
 * @param {number} [height]
 * @param {ResizeDirection} [direction] Which handle is being resized. When given, the edges opposite
 * the handle stay put (so resizing up/left/top-left also moves the window).
 */
Dialog.prototype.resize = function (width, height, direction) {
	if (this.fixed) return;
	if (typeof width === "undefined" || width === null) width = this.width;
	if (typeof height === "undefined" || height === null) height = this.height;
	// Full-height snap hands the height back untouched when it is left, so the drag may
	// keep changing the width but never the size it entered with — otherwise the window
	// would come back at whatever the resize had grown to underneath the CSS layer.
	if (this.heightSnapped) height = this.height;

	var oldWidth = this.width, oldHeight = this.height;

	if (this._aspectRatioEnabled && this._aspectRatio) this._resizeWithAspect(width, height, direction);
	else this._resizeFree(width, height, direction);

	if (oldWidth !== this.width || oldHeight !== this.height) {
		var state = {};
		if (oldWidth !== this.width) state.width = this.width;
		if (oldHeight !== this.height) state.height = this.height;
		this.broadcastState(state);
	}
};

/**
 * Applies a resize that keeps the opposite edges of the given direction fixed.
 * @param {number} width
 * @param {number} height
 * @param {ResizeDirection} [direction]
 */
Dialog.prototype._resizeFree = function (width, height, direction) {
	var oldX = this.x, oldY = this.y;
	var oldW = this.width, oldH = this.height;
	var bounds = WindowManager.windowBounds;
	var maxW = this._maxWidth, maxH = this._maxHeight;
	var minW = this._minWidth, minH = this._minHeight;

	width = Math.max(Math.min(width, maxW), minW);
	height = Math.max(Math.min(height, maxH), minH);

	var newW = width, newH = height;

	// Clamp width so the moving edge doesn't exceed bounds
	if (direction === "left" || direction === "bottom-left" || direction === "top-left") {
		newW = Math.min(newW, oldX + oldW - bounds.left);
	} else if (direction !== "top" && direction !== "bottom") {
		newW = Math.min(newW, bounds.right - oldX);
	}

	// Clamp height so the moving edge doesn't exceed bounds
	if (direction === "top" || direction === "top-left" || direction === "top-right") {
		newH = Math.min(newH, oldY + oldH - bounds.top);
	} else if (direction !== "left" && direction !== "right") {
		newH = Math.min(newH, bounds.bottom - oldY);
	}

	// The repositioned edges are a pure function of the size, so unchanged dimensions mean the
	// window did not move either — skip every remaining assignment and style/layout write.
	if (newW === oldW && newH === oldH) return;

	var newX = oldX, newY = oldY;

	switch (direction) {
		case "bottom-left":
		case "left":
			newX = oldX + oldW - newW;
			break;
		case "top-left":
			newX = oldX + oldW - newW;
		case "top-right":
		case "top":
			newY = oldY + oldH - newH;
			break;
		// bottom-right, bottom, right (and default): keep the top-left edge fixed.
	}

	this._width = newW;
	this._height = newH;
	this._isMinWidth = newW === minW;
	this._isMinHeight = newH === minH;

	if (newX !== oldX || newY !== oldY) this.move(newX, newY);
	this.updateWidth();
	this.updateHeight();
};

/**
 * Resizes while keeping the window at its aspect-ratio constraint, moving it so the
 * edges opposite the given direction stay fixed.
 * @param {number} width
 * @param {number} height
 * @param {ResizeDirection} [direction]
 */
Dialog.prototype._resizeWithAspect = function (width, height, direction) {
	var ratio = this._aspectRatio;
	var oldX = this.x, oldY = this.y;
	var oldW = this.width, oldH = this.height;
	var oldRight = oldX + oldW, oldBottom = oldY + oldH;
	var bounds = WindowManager.windowBounds;
	var maxW = this._maxWidth, maxH = this._maxHeight;
	var minW = this._minWidth, minH = this._minHeight;

	var isCorner = direction === "top-left" || direction === "top-right" || direction === "bottom-left" || direction === "bottom-right";

	var newW, newH;
	if (isCorner && this._constrainAspectRatioLine) {
		// Straight-line mode: pin the dragged corner onto the window's own diagonal and scale the
		// window with the cursor's projection onto that diagonal, so the corner glides along a
		// straight path between the corners. No clamping or axis-locking logic runs here.
		var fX, fY, cX, cY, diagX, diagY;
		switch (direction) {
			case "top-left":
				fX = oldRight; fY = oldBottom;
				cX = oldRight - width; cY = oldBottom - height;
				diagX = -1; diagY = -1 / ratio;
				break;
			case "top-right":
				fX = oldX; fY = oldBottom;
				cX = oldX + width; cY = oldBottom - height;
				diagX = 1; diagY = -1 / ratio;
				break;
			case "bottom-left":
				fX = oldRight; fY = oldY;
				cX = oldRight - width; cY = oldY + height;
				diagX = -1; diagY = 1 / ratio;
				break;
			default:
				fX = oldX; fY = oldY;
				cX = oldX + width; cY = oldY + height;
				diagX = 1; diagY = 1 / ratio;
				break;
		}
		// Project the cursor onto the diagonal; scale clamps at 0 so a cursor crossing the stable
		// corner pins the window instead of collapsing it.
		var scale = ((cX - fX) * diagX + (cY - fY) * diagY) / (diagX * diagX + diagY * diagY);
		if (scale < 0) scale = 0;
		newW = scale;
		newH = scale / ratio;
	} else {
		// The mouse can move past the stable (non-drag) edge, making one of the distances negative.
		// Clamp them at zero so the edge pins there instead of collapsing the window to min size.
		if (width < 0) width = 0;
		if (height < 0) height = 0;

		var driveByWidth;
		if (direction === "top" || direction === "bottom") {
			driveByWidth = false;
		} else if (isCorner) {
			// The requested width/height are the mouse's distances from the stable corner. Which
			// axis to lock is decided by which side of the corner's aspect-ratio diagonal the mouse
			// is on. L (inner): hug the corner; V (outer): extend straight away from the window.
			var boxRatio = height ? width / height : (width > 0 ? Infinity : 1);
			driveByWidth = this._constrainAspectRatioInner ? boxRatio <= ratio : boxRatio > ratio;
		} else {
			driveByWidth = true;
		}

		if (driveByWidth) {
			newW = Math.max(Math.min(width, maxW), minW);
			newH = newW / ratio;
			if (newH > maxH) { newH = maxH; newW = newH * ratio; }
			if (newH < minH) { newH = minH; newW = newH * ratio; }
		} else {
			newH = Math.max(Math.min(height, maxH), minH);
			newW = newH * ratio;
			if (newW > maxW) { newW = maxW; newH = newW / ratio; }
			if (newW < minW) { newW = minW; newH = newW / ratio; }
		}
	}

	// Clamp to the window bounds, keeping the aspect ratio
	var fromLeft = direction === "left" || direction === "bottom-left" || direction === "top-left";
	newW = Math.min(newW, fromLeft ? oldRight - bounds.left : bounds.right - oldX);
	newH = newW / ratio;
	var fromTop = direction === "top" || direction === "top-left" || direction === "top-right";
	newH = Math.min(newH, fromTop ? oldBottom - bounds.top : bounds.bottom - oldY);
	newW = newH * ratio;

	// Re-enforce min/max, keeping the aspect ratio. newW === newH * ratio here in every mode,
	// so clamp the width scale against both axes' limits and re-derive the height — clamping
	// each axis independently instead would squish the window away from the ratio.
	var minScale = Math.max(minW, minH * ratio);
	var maxScale = Math.min(maxW, maxH * ratio);
	if (newW < minScale) newW = minScale;
	if (newW > maxScale) newW = maxScale;
	newH = newW / ratio;

	// The repositioned edges are a pure function of the size, so unchanged dimensions mean the
	// window did not move either — skip every remaining assignment and style/layout write.
	if (newW === oldW && newH === oldH) return;

	var newX = oldX, newY = oldY;
	switch (direction) {
		case "bottom-left":
			newX = oldRight - newW;
			break;
		case "top-left":
			newX = oldRight - newW;
		case "top-right":
			newY = oldBottom - newH;
			break;
		case "left":
			newX = oldRight - newW;
		case "right":
			newY = oldY + oldH / 2 - newH / 2;
			break;
		case "top":
			newY = oldBottom - newH;
		case "bottom":
			newX = oldX + oldW / 2 - newW / 2;
			break;
	}

	this._width = newW;
	this._height = newH;
	this._isMinWidth = newW === minW;
	this._isMinHeight = newH === minH;

	if (newX !== oldX || newY !== oldY) this.move(newX, newY);
	this.updateWidth();
	this.updateHeight();
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
 * @param {number} [right]
 * @param {number} [bottom]
 */
Dialog.prototype.setInset = function(top, left, right, bottom) {
	if (this.useScale) right = undefined, bottom = undefined;
	if (this.target) insetElement(this.target, top, left, right, bottom);
};
/** @param {string} [url] */
Dialog.prototype.openUrl = function(url) {
	var frame = this.getOrCreateFrame(true);
	if (!frame) return;

	var self = this;
	let timeout = -1;

	frame.onload = function() {
		clearTimeout(timeout);
		self.reportState();
	};

	if (!this.application) return;

	var baseUrls = [url || this.src, this.application.distSrc];

	if (!isLocal) baseUrls.reverse();

	var fallbackUrls = baseUrls.concat(this.application.altUrls);

	let index = 0;

	function tryNext() {
		var url = fallbackUrls[index++];
		if (index >= fallbackUrls.length || !frame || !url) return;

		frame.src = url;
		self._src = url;

		clearTimeout(timeout);
		timeout = setTimeout(tryNext, 3000);
	}

	frame.addEventListener("error", tryNext);

	tryNext();
};

Dialog.prototype.refresh = function() { if (this.frame) this.openUrl(this.frame.src); };

Dialog.prototype.loadFrame = function() {
	if (!this.application) return;
	var frame = this.getOrCreateFrame(true);
	if (frame) appManager.openAppInIFrame(this.application.id, frame);
};

Dialog.prototype.launch = function() {
	// TODO: initstate cuz it might nt have to init again to open
	if (!this.isOpen) this.initWithObject(this);
	if (this.mica) this.injectMica();

	this.open();
};

Dialog.prototype.relaunch = function() {
	this.close();
	this.launch();
};

Dialog.prototype.kill = function() {
	var parent = this.target && this.target.parentElement;
	if (parent && this.closeable && this.target) parent.removeChild(this.target);
};
Dialog.prototype.eject = function() {
	this.createPopOut();
	this.close();
};
Dialog.prototype.createPopOut = function() {
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
		this.toggleMinSizeConstraints(this.maximized);
	} else {
		if (this.useTransform) return console.warn("Cannot disable scale if using transform");
		target.style.right = toPixels(this.right);
		target.style.bottom = toPixels(this.bottom);
	}
	target.classList.toggle("use-scale", useScale);

	this.update();
};

/** @param {boolean} [isMaximized] */
Dialog.prototype.toggleMinSizeConstraints = function(isMaximized) {
    if (!this.target) return;
    this.target.style.minWidth = isMaximized ? "100%" : toPixels(this.minWidth);
    this.target.style.minHeight = isMaximized ? "100%" : toPixels(this.minHeight);
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

Dialog.prototype.makeWallpaper = function() { if (this.id) appManager.setWallpaper(this.id); };

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

/**
 * Applies a (possibly partial) DialogState. Only the fields present in the state are
 * touched, so a geometry-only broadcast never disturbs open/maximized/title and vice
 * versa. Used both for cross-tab dialog-state broadcasts and local restore.
 * @param {Partial<DialogState>} state
 */
Dialog.prototype.loadState = function(state) {
	if (!state) return;
	if ("open" in state) {
		if (state.open) this.launch();
		else if (this.target) this.toggleOpen(false);
	}
	if ("title" in state) this.title = state.title;
	if ("x" in state || "y" in state)
		this.move("x" in state ? state.x : this.x, "y" in state ? state.y : this.y);
	if ("z" in state && typeof state.z === "number") this.setZ(state.z);
	if ("width" in state || "height" in state)
		this.resize("width" in state ? state.width : this.width, "height" in state ? state.height : this.height);
	if ("maximized" in state) this.toggleMaximized(state.maximized === true);
};

Dialog.prototype.exportDialogBodyToMetro = function() {

};
/** @param {string} id */
Dialog.prototype.getElementById = function(id) {
	console.log("Element ID to pull out of my guts: " + id);
	var doc = this.contentDocument;
	return doc && doc.getElementById(id);
};
/** @param {string} id */
Dialog.prototype.moveElementIntoPipById = function(id) {
	var targetElement = this.getElementById(id);
	console.log("Ripped out element:", targetElement);
	if (targetElement && Modern) Modern.toggleElementPip(targetElement, function (window) {
		window.onresize = function() {
			if (!(targetElement instanceof HTMLCanvasElement)) return;
			targetElement.width = targetElement.clientWidth;
			targetElement.height = targetElement.clientHeight;
		};
	});
};

Dialog.prototype.screenshot = function() {
	var target = this.target;
	if (!target) return;
	if (screenShooter) screenShooter.screenshotElement(target);
}

//#endregion

//#region DragAction

/**
 * @constructor
 * @class
 */
function DragAction() {
	/** @type {DragFunction} */
	this.execute = function(){};
	/** @type {DragFunction[]} */
	var resizeFunctions = [
		function move(dialog, offset, d){ dialog.move(offset.startX + d.x, offset.startY + d.y); },
		function top(dialog, offset, d){ dialog.resize(offset.width, offset.height - d.y, "top"); },
		function right(dialog, offset, d){ dialog.resize(offset.width + d.x, offset.height, "right"); },
		function bottom(dialog, offset, d){ dialog.resize(offset.width, offset.height + d.y, "bottom"); },
		function left(dialog, offset, d){ dialog.resize(offset.width - d.x, offset.height, "left"); },
		function topLeft(dialog, offset, d){ dialog.resize(offset.width - d.x, offset.height - d.y, "top-left"); },
		function topRight(dialog, offset, d){ dialog.resize(offset.width + d.x, offset.height - d.y, "top-right"); },
		function bottomRight(dialog, offset, d){ dialog.resize(offset.width + d.x, offset.height + d.y, "bottom-right"); },
		function bottomLeft(dialog, offset, d){ dialog.resize(offset.width - d.x, offset.height + d.y, "bottom-left"); }
	];
	this.resizeFunctions = resizeFunctions;
}

/** @param {number} [direction] */
DragAction.prototype.set = function (direction) {
	this.direction = direction || 0;
	this.execute = this.resizeFunctions[this.direction] || function () {};
};

//#endregion

//#region DocumentCrawler

/**
 * @param {HTMLDocument} [customDocument]
 * @class
 */
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
windowManager = windowManager;
windowManager.isWindowUpdatesEnabled = true;
var bodyCrawler = new DocumentCrawler;

window.__LVMessengerReceive = messageReceived;
window.__LVMessenger = {};

//#endregion

/*\  The purpose is for this website to be functional on every browser that's less than or a decade old. I created my own polyfills for some functions that don't exist in ES5, so performance on ES6 browsers is expected to be better. Meow.
 * \  Tested and confirmed functional (can work on stuff I haven't tested too.):
 *  \  Chrome for Android Chrome targeting 36 and up.
 *   \  FireFox 115 ESR and up (should work on any version that's less than 10 years old, or at least has ES5 support (2009))
 *    \  Chromium 36 (That means Chrome, Edge Chromium, Brave, Opera, ...)
 *    /  ToDo: Test on Safari on macOS 10.7 Lion and 10.15 Catalina when I have time to do so. Same goes for Firefox and Chrome versions that I have installed on these systems. From the tests in Dialogs 8.1 I expect this to work fine!
 *   /  Internet Explorer 11 Trident + EdgeHTML 12-18 (Edge Legacy)
 *  /  Pale Moon 34
 * /  Safari 5+ (Windows and Mac OS X)
\*/


/**
 * @template T
 * @param {T} type
 * @returns {T}
 */
function genericTyped(type) {
	return type;
}

const hey = genericTyped(document.createElement("button"))

const meow = document.createElement("applet");