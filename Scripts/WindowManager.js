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

var isBlink = "chrome" in window;
var isIE = typeof window !== "undefined" && typeof document !== "undefined" && !!window.MSInputMethodContext && document.documentMode === 11;

// IE and HTA expose MSPointerEvent but never fire the unprefixed pointer events the manager listens for.
var supportsPointer = typeof window !== "undefined" && "PointerEvent" in window && !isIE && !("MSPointerEvent" in window);
var supportsObjectFit = Boolean(document.documentElement && document.documentElement.style && typeof document.documentElement.style.objectFit !== "undefined");
var supportsTransitions = false;
var supportsTransform = false;

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


/** @type {"webkitTransitionEnd" | "transitionend"} */
// Prefer the unprefixed event wherever the unprefixed style property exists: modern
// Chrome still exposes "webkitTransition" in the style object but only ever dispatches
// "transitionend", so testing the prefixed property alone picks an event name that
// never fires and every animated toggle hangs waiting for its end.
var transitionEndEvent = ("transition" in document.documentElement.style) ? "transitionend" :
	("webkitTransition" in document.documentElement.style) ? "webkitTransitionEnd" : "transitionend";


if (isIE) useTransform = true;

if (!supportsTransform) useTransform = false;

var flags = {
	useSkewAnimations: false,
	aeroSnap: true,
	updateRateLimit: true,
	useDragOverlay: true,
	broadcastWindowMoves: !document.documentMode,
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
	_preserveMaximizeAspect: false,
	get preserveMaximizeAspect() { return this._preserveMaximizeAspect; },
	set preserveMaximizeAspect(value) {

		document.body.classList.toggle("preserve-aspect", !!value);
		this._preserveMaximizeAspect = value;
	},
	windowReaper: false,
	verboseLogs: false,
	_enableExtensions: true,
	get enableExtensions() { return this._enableExtensions; },
	set enableExtensions(value) {
		window.windowManager.extensions.forEach(function(ext) {
			window.windowManager.setExtensionEnabled(ext, value);
		});
	}
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


/**
 * @param {Node | EventTarget | null} [object]
 * @returns {object is HTMLElement}
 */
Helpers.isElement = function(object) { return object && "nodeType" in object || false; };


/** @param {Window} window */
function getWindowChromeHeight(window) {
	return window.outerHeight - window.innerHeight;
}

/**
 * @param {HTMLElement} element
 * @param {number} x
 * @param {number} y
 */
Helpers.translateElement = function(element, x, y) {
	transformElement(element, { x: x, y: y });
};

/**
 * @param {HTMLElement} element
 * @param {Transform} t
 */
function transformElement(element, t) {
	var transform = "";

	if (t.x && t.y) transform += "translate(" + Helpers.toPixels(t.x) + "," + Helpers.toPixels(t.y) + ")";
	else if (t.x) transform += "translateX(" + Helpers.toPixels(t.x) + ")";
	else if (t.y) transform += "translateY(" + Helpers.toPixels(t.y) + ")";

	// var transform = "translate(" + Helpers.toPixels(transform.x) + "px," + Math.floor(transform.y) + "px)";
	if (t.skewX) transform += " skewX(" + Helpers.toDegrees(t.skewX) + ")";
	if (t.scaleX === 1) t.scaleX = undefined;
	if (t.scaleY === 1) t.scaleY = undefined;
	if (t.scaleX && t.scaleY) transform += "scale(" + t.scaleX + "," + t.scaleY + ")";
	else if (t.scaleX) transform += "scaleX(" + t.scaleX + ")";
	else if (t.scaleY) transform += "scaleY(" + t.scaleY + ")";

	if (t.rotate) transform += "rotate(" + Helpers.toDegrees(t.rotate) + ")";
	if (t.rotateX) transform += "rotateX(" + Helpers.toDegrees(t.rotateX) + ")";
	if (t.rotateY) transform += "rotateY(" + Helpers.toDegrees(t.rotateY) + ")";
	if (t.rotateZ) transform += "rotateZ(" + Helpers.toDegrees(t.rotateZ) + ")";

	if ("msTransform" in element.style) element.style.msTransform = transform;
	else element.style.transform = transform;
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
		if (typeof left === "undefined") element.style.inset = Helpers.toPixels(top);
	else element.style.inset = Helpers.toPixels(top) + " " + Helpers.toPixels(right || 0) + " " + Helpers.toPixels(bottom || 0) + " " + Helpers.toPixels(left);
	else {
		if (typeof left === "undefined") left = top, right = top, bottom = top;
		element.style.top = Helpers.toPixels(top);
		element.style.left = Helpers.toPixels(left);
		if (typeof right !== "undefined") element.style.right = Helpers.toPixels(right);
		if (typeof bottom !== "undefined") element.style.bottom = Helpers.toPixels(bottom);
	}
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

function getOverlay() { return document.getElementById("overlay"); }

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
				var overlay = getOverlay();
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
					overlay.requestFullscreen().catch(function() {});
					if (dialog.body) overlay.appendChild(dialog.body);
					window.setTimeout(overlay.classList.add.bind(overlay.classList, "shown"), 500);
				};
				overlay.classList.toggle("open");
				break;
			case "readyToLaunchOverlay":
				var overlay1 = getOverlay();
				if (!overlay1) break;
				if (dialog.body) overlay1.appendChild(dialog.body);
				window.setTimeout(overlay1.classList.add.bind(overlay1.classList, "shown"), 500);
				break;
			case "pip":
				dialog.moveElementIntoPipById(data.id, data.stylesheet);
				break;
			case "visualizers":
				dialog.messageFrame("visualizers", windowManager.getVisualizerApps());
				break;
		}
	}
}

function swapMetroBody() {
	if (!windowManager.flipped) return;
	windowManager.activeDialogToMetro();
}

/** @param {boolean} enable */
function flip(enable){
	var desktop = document.getElementById("desktop");;
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

function Helpers() {
	this. ok = false;
}

/** @param {WindowOpenProperties} properties */
Helpers.stringifyWindowOpenProperties = function(properties){
	return JSON.stringify(properties).replace(/true/g, "yes").replace(/false/g, "no").replace(/:/g, "=").replace(/[}{"]/g, "");
};

Helpers.getViewBoxPosition = function() {
	return { x: window.screenLeft, y: window.screenTop };
};

Helpers.toPixels = function(/** @type {number} */value) { return Math.round(value) + "px"; };
Helpers.toDegrees = function(/** @type {number} */value) { return Math.round(value) + "deg"; };

/** @param {number} pixels */
Helpers.pixelsToCentimeters = function(pixels){
	return (pixels * 2.54 / 96) * (window.devicePixelRatio || 1);
};

/** @param {string} text */
Helpers.fromPixels = function(text){
	if (text !== null) try {
		return typeof text === "number" ? text : parseInt(text.replace("px", ""));
	} catch (ex) { console.warn("Failed to parse pixels:", ex); }
	return 0;
};

/** @param {*} exception */
function handleStorageException(exception) {
	localStorage.windowState = null;
	windowManager.canSave = false;
	console.warn(exception);
}

function getDialogTemplate() {
	var template = document.querySelector("template") || document.getElementById("window-template");
	if (!template) return;
	var content = template;
	if (template instanceof HTMLTemplateElement) return template.content.children[0];
	return content.children[0];
}

/** @returns {HTMLElement | WindowElement} */
function createDialogElement() {
	// var container = document.getElementById("window-section");
	var template = getDialogTemplate();
	if (!template) throw new Error("Can't find dialog template!");
	var clone = removeComments(template.cloneNode(true));
	if (!(clone instanceof HTMLElement)) throw new Error("Cloned dialog is not an element");
	return clone;
}

/** @param {Node} element */
function removeComments(element){ // Removes the comments of an HTMLElement based object.
	element.childNodes.forEach(function (child) {
		if (child.nodeName === "#comment") element.removeChild(child);
		else if (Helpers.isElement(child)) removeComments(child);
	});
	return element;
}

/**
 * Plays a layout change on an element as a FLIP: the element is measured, the change
 * is applied, the new frame is measured, and the old frame is then slid and scaled back
 * over the new one so the browser can ease between them. The independent translate and
 * scale properties are used rather than transform, because a snapped window pins
 * transform to none and keeps them free for exactly this.
 * @param {HTMLElement} element
 * @param {(this: any) => void} [onToggled] Applies the change. Runs synchronously.
 * @param {any} [thisArg]
 */
function flipElement(element, onToggled, thisArg) {
	var first = element.getBoundingClientRect();

	// Suppress transitions while the change and the compensation are written, so the
	// element cannot ease from its un-inverted frame to the inverted one.
	var previousTransition = element.style.transition;
	element.style.transition = "none";

	if (onToggled) onToggled.call(thisArg || element);

	var last = element.getBoundingClientRect();
	var dx = first.left - last.left;
	var dy = first.top - last.top;
	var scaleX = last.width ? first.width / last.width : 1;
	var scaleY = last.height ? first.height / last.height : 1;

	element.style.transformOrigin = "top left";
	element.style.translate = Helpers.toPixels(dx) + " " + Helpers.toPixels(dy);
	element.style.scale = scaleX + " " + scaleY;

	// Commit the inverted frame as the transition's starting point.
	void element.offsetWidth;

	element.style.transition = previousTransition;
	element.classList.add("animating", "flipping");

	element._flipFrame = window.requestAnimationFrame(function() {
		element._flipFrame = 0;
		element.style.translate = "0px 0px";
		element.style.scale = "1";
	});
}

/**
 * Undoes everything {@link flipElement} wrote, so the element is back to its own state.
 * @param {HTMLElement} element
 */
function clearFlip(element) {
	if (element._flipFrame) {
		window.cancelAnimationFrame(element._flipFrame);
		element._flipFrame = 0;
	}
	element.style.translate = "";
	element.style.scale = "";
	element.style.transformOrigin = "";
	element.classList.remove("flipping");
}

/**
 * @template {Record<string, any> | HTMLElement} [T=HTMLElement]
 * @param {HTMLElement} element
 * @param {(this: T) => void} [onToggled]
 * @param {TransitionEndCallback} [onTransitionEnd]
 * @param {(this: T) => void} [onEnd]
 * @param {T} [thisArg]
 * @param {number} [timeout]
 * @param {boolean} [flip] Play the toggled change as a FLIP (see {@link flipElement}).
 */
function animateElement(element, onToggled, onTransitionEnd, onEnd, thisArg, timeout, flip) {
	/** @type {T} */
	// @ts-ignore
	var boundContext = thisArg || element;

	var callEnd = function() {
		// A superseded animation must not run its callback.
		if (!state.active) return;
		state.active = false;
		if (element._animationState === state) element._animationState = null;

		element.classList.remove("animating");
		if (flip) clearFlip(element);
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
		if (previous.flip) clearFlip(element);
	}

	/** @type {{ timer: number, frame: number, handler: ((ev: TransitionEvent)=>void) | null, active: boolean, flip: boolean }} */
	var state = element._animationState = { timer: 0, frame: 0, handler: null, active: true, flip: !!flip };

	if (!flags.useAnimations) {
		if (onToggled) onToggled.call(boundContext);
		callEnd();
		return;
	}

	state.timer = timeout && setTimeout(callEnd, timeout) || 0;

	if (supportsTransitions) {
		if (flip) {
			// A FLIP has to measure the frames around the change, so it runs now rather
			// than from the rAF the plain path defers the toggle to.
			flipElement(element, onToggled, boundContext);
		} else element.classList.add("animating");

		/** @type {(ev: TransitionEvent)=>void} */
		var animationHandler = function(event) {
			if (!onTransitionEnd) return;
			if (typeof onTransitionEnd === "string") {
				if (event.propertyName !== onTransitionEnd) return;
			} else if (!onTransitionEnd(event.propertyName)) return; // TODO these ifs can probably be made one

			element.removeEventListener(transitionEndEvent, animationHandler, false);
			clearTimeout(state.timer);
			callEnd();
		};

		state.handler = animationHandler;
		element.addEventListener(transitionEndEvent, animationHandler, false);
	}

	if (!flip || !supportsTransitions) {
		state.frame = window.requestAnimationFrame(function() {
			state.frame = 0;
			if (onToggled) onToggled.call(boundContext);
		});
	}
}

//#endregion

//#region Window Manager

/** @class */
function WindowManager() {
	/** @type {DialogMap} @const */
	this._windows = {};

	/** @type {DesktopState | null} */
	this._windowStates = null;

	this._isBlurEnabled = true;
	this._isWindowUpdatesEnabled = false;

	this.isDragging = false;
	/** @constant */
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
	 * leftover width so the group always fills the area.
	 * @type {boolean}
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

	this.channel = BroadcastChannel && new BroadcastChannel("lvos");

	this.channel.onmessage = function(ev) {
		var data = ev.data;
		if (typeof data === "string") try { data = JSON.parse(data); } catch (ex) { return console.warn(ex); }
		if (!data || typeof data !== "object" || typeof data.type !== "string") return;
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
			if (event && !event.which && !event.button && event.buttons === 0 && self.isDragging) {
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
		} catch (ex) { console.warn(ex); }
	};

	this.windowSnap = new WindowSnap;

	/**
	 * Snap tile groups, one per desktop window-section. A group only ever lays out
	 * the windows of its own section, so snapping a window on any desktop tiles it
	 * inside that desktop and never moves it to another one.
	 * @type {Map<Element, WindowGroup>}
	 */
	this.snapGroups = new Map();

	/** @type {Extension[]} */
	this.extensions = [];

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
		} catch (ex) { console.log(ex); }
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
	try {
		if (this.canSave && typeof localStorage !== "undefined")
			localStorage.setItem("windowState", JSON.stringify(this.state));
	} catch (exception) {
		handleStorageException(exception);
	}
};

/** @param {Dialog} [dialog] */
WindowManager.prototype.loadState = function(dialog) { // TODO: Load the state from localstorage on object creation, then keep that in memory for reading and add a func like this that takes one dialog as param and only restores for that
	if (!this.canSave) return;
	try {
		if (!("localStorage" in window)) return;
		var windowStates = this.windowStates;
		this.loaded = true;
		if (!windowStates) return;
		if (dialog && dialog.id) {
			dialog.loadState(windowStates[dialog.id]);
			this.updateTopZ(dialog.z);
		} else {
			for (var id in windowStates) try {
				var dialog = this.windows[id];
				if (dialog && windowStates[id]) dialog.loadState(windowStates[id]);
			} catch (ex) { console.log(ex); }
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

WindowManager.prototype.synchronizeStates = function () {
	this.forEachWindow(function(dialog) { dialog.reportState(); });
};

/** @param {Application | HTMLElement} app */
WindowManager.prototype.loadApp = function(app) {
	try {
		var dialog = new Dialog(app);
		this._windows[app.id] = dialog;
		if (!(app instanceof HTMLElement)) appManager.addApp(app);
		return dialog;
	} catch(ex) { console.warn("App load failed", ex); return null; }
};

/**
 * Creates an additional window for an app that allows multiple instances, registered
 * under a unique id so every instance keeps its own geometry and state. The app object
 * is cloned and is not added to the app registry again.
 * @param {Application} application
 * @returns {Dialog | null}
 */
WindowManager.prototype.spawnApp = function(application) {
	if (!application || !application.id) return null;

	// Find a free instance id: "app", then "app#2", "app#3", ...
	var id = application.id, n = 1;
	while (this._windows[id]) id = application.id + "#" + (++n);

	/** @type {Application} */
	var instance = {};
	for (var key in application) if (application.hasOwnProperty(key)) instance[key] = application[key];
	instance.id = id;

	try {
		var dialog = new Dialog(instance);
		this._windows[id] = dialog;
		return dialog;
	} catch(ex) { console.warn("App spawn failed", ex); return null; }
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
		} catch (ex) {
			console.log(ex);
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

/**
 * Opens the application carried by a drop as a window and places it under the pointer
 * using the grab offset from the drag, so it lands exactly where the preview showed it
 * instead of at its saved position.
 * @param {Application} application
 * @param {number} x Pointer position when the drag was dropped, in pixels.
 * @param {number} y Pointer position when the drag was dropped, in pixels.
 * @param {Coord} [offset] Pointer position relative to the window centre when the drag started.
 * @param {Partial<DialogState>} [state] The saved state that was dragged with the window.
 */
WindowManager.prototype.dropApplication = function (application, x, y, offset, state) {
	if (!application || !application.id) return null;

	var dialog;
	if (application.multiple) {
		// Drop of a multi-instance app always opens another window instead of reusing.
		dialog = this.spawnApp(application);
	} else {
		dialog = this.windows[application.id];
		if (!dialog) {
			this.loadApp(application);
			dialog = this.windows[application.id];
		}
	}
	if (!dialog) return null;

	// Apply the dragged state first so the window keeps its size (and other state)
	// from when it was dragged, then position it under the cursor.
	dialog.loadState(state || {});

	dialog.launch();
	dialog.setZ();

	if (typeof x === "number" && typeof y === "number") {
		// Cancel out the grab offset so the point of the window the pointer held stays
		// under the pointer, which is where the drag preview left it.
		var grabX = offset ? offset.x : 0;
		var grabY = offset ? offset.y : 0;
		dialog.moveToCenter(x - grabX, y - grabY);
	}

	// Force a layout pass so the window's rendered size matches the applied state,
	// especially when restored from a hidden HTML JSON drop.
	try {
		dialog.resize();
		if (typeof dialog.update === "function") dialog.update();
		var rect = getRect(dialog.target);
		if (rect) {
			var bw = rect.width, bh = rect.height;
			if (Math.abs(bw - dialog.width) > 1 || Math.abs(bh - dialog.height) > 1) {
				dialog._width = bw;
				dialog._height = bh;
				if (typeof dialog.broadcastState === "function") dialog.broadcastState({ width: bw, height: bh });
			}
		}
		dialog.resize();
	} catch (ex) { console.log(ex); }

	return dialog;
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

/** @type {Bounds} */
WindowManager.windowBoundsInset = { top: 0, left: -100, right: -100, bottom: -100 };
/** @type {Bounds} */
WindowManager._windowBounds = { top: 0, left: 0, right: 0, bottom: 0 };

WindowManager.recalculateWindowBounds = function() {
	var inset = WindowManager.windowBoundsInset;
	WindowManager._windowBounds.top = inset.top !== null ? inset.top : -Infinity;
	WindowManager._windowBounds.left = inset.left !== null ? inset.left : -Infinity;
	WindowManager._windowBounds.right = inset.right !== null ? window.innerWidth - inset.right : Infinity;
	WindowManager._windowBounds.bottom = inset.bottom !== null ? window.innerHeight - inset.bottom : Infinity;
};

Object.defineProperty(WindowManager, "windowBounds", {
	get: function () { return WindowManager._windowBounds; }
});

/** @param {Dialog} dialog */
WindowManager.prototype.focusDialog = function(dialog) {
	if (this.focusedDialog !== null && this.focusedDialog.target)
		this.focusedDialog.target.removeAttribute("focus");
	dialog.target.setAttribute("focus", String(true));
	this.focusedDialog = dialog;
};


WindowManager.prototype.activeDialogToMetro = function() { if (this.activeDialog) this.activeDialog.exportDialogBodyToMetro(); };

WindowManager.prototype.initializeDialogs = function() {
	var self = this;
	var stop = function() { self.disableDialogDrag(); };
	var event = supportsPointer ? "pointerup" : "mouseup";
	if (typeof document !== "undefined") document.addEventListener(event, stop, false);
	if (typeof window !== "undefined") window.addEventListener(event, stop, false);
	if (!supportsPointer && typeof document !== "undefined") {
		document.addEventListener("mouseup", stop, false);
	}
	if (!supportsPointer && typeof window !== "undefined") {
		window.addEventListener("mouseup", stop, false);
	}

	this.dragAction.set(0);
	if (typeof document !== "undefined") {
		var dialogs = document.getElementsByClassName("window");
		for (var i = 0; i < dialogs.length; i++) {
			var dialog = dialogs[i];
			if (Helpers.isElement(dialog))
				self.loadApp(dialog);
		}
	}
	this.loadState();

	// document.body.document.body.appendChild(this.windowSnap);
	if (this.windowSnap && typeof this.windowSnap.init === "function") this.windowSnap.init();
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
		while (node && Helpers.isElement(node) && node.nodeType === 1) {
			var tn = (node.tagName || "").toLowerCase();
			if (tn === "input" || tn === "textarea" || tn === "select" || tn === "button" || tn === "a" || tn === "label" || tn === "output") { isInteractive = true; break; }
			if (node.hasAttribute && node.hasAttribute("contenteditable")) { isInteractive = true; break; }
			node = node.parentElement;
		}
		if (isInteractive) {
			try { dialog.focus(); } catch (ex) { console.log(ex); }
			return dialog;
		}
	} catch (ex) { console.log(ex); }

	cancelDomEvent(event);

	if (window.desktopManager && window.desktopManager.isExposé) {
		var root = document.querySelector("main");
		if (root) {
			// Remember the desktop and position to fly back to on a miss-drop.
			var section = dialog.target.closest("#window-section, .window-section");
			var origin = -1;
			if (section) for (var i = 0; i < window.desktopManager.desktops.length; i++) {
				var desktop = window.desktopManager.desktops[i];
				if (desktop && desktop.target === section) { origin = i; break; }
			}
			dialog._exposeOrigin = origin >= 0 ? { index: origin, x: dialog.x, y: dialog.y } : null;
			dialog.detachToRootKeepingVisual(root);
		}
	} else dialog.clearExposéVisual();

	if (supportsPointer && event && "pointerId" in event && event.target instanceof HTMLElement && typeof event.target.setPointerCapture === "function") {
		try { event.target.setPointerCapture(event.pointerId); } catch (ex) { console.log(ex); }
	}
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
	// A frame must never outlive the gesture it belongs to: once the drag is over, a
	// leftover drag event would run with dragAction reset to a plain move and jump the
	// window to grab-position + cursor delta instead of keeping the resize.
	if (!this.isDragging) return;
	var dialog = this.activeDialog;
	if (!dialog || !dialog.clickOffset) return;

	// Both maximized and tiled windows are drawn in a frame of their own while their
	// x/y/width/height still hold the floating geometry underneath. The grab point was
	// recorded against that drawn frame, so remap it into the floating geometry before
	// dragging or the window jumps away from the cursor.
	if (dialog.maximized) {
		if (!flags.aeroSnap) return;
		var snapSection = this.getSnapContainer(dialog);
		dialog.remapClickOffset(0, 0, this.snapWidth(snapSection), this.snapHeight(snapSection));
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
		} else if (gestureDirection && this.isVerticalResizeDirection(gestureDirection)) {
			this.leaveHeightSnappedByResize(dialog);
		}
	}

	dialog.stopAnimating();

	// During an exposé drag the window lives in <main> (scale 1) while its content is
	// counter-scaled to the desktop preview, so the applied movement must be divided by
	// that scale or the window visual lags behind the cursor.
	var dragScale = typeof dialog._exposeVisualScale === "number" && dialog._exposeVisualScale > 0 ? dialog._exposeVisualScale : 1;
	// Remember where inside the window the user grabbed, in unscaled window coordinates:
	// the grab point stays glued to the cursor at any content scale.
	if (typeof dialog._exposeVisualScale === "number" && !dialog._exposeGrab && dialog.clickOffset && dialog.content) {
		var grabRect = dialog.content.getBoundingClientRect();
		if (grabRect.width) dialog._exposeGrab = {
			x: (dialog.clickOffset.clickX - grabRect.left) / dragScale,
			y: (dialog.clickOffset.clickY - grabRect.top) / dragScale
		};
	}
	this.dragAction.execute(dialog, dialog.clickOffset, dragScale === 1 ? difference : { x: difference.x / dragScale, y: difference.y / dragScale });

	// Remember where the pointer was: the drop in disableDialogDrag happens after the
	// pointer is gone and must still decide the same zone.
	this.setPointerPosition(newX, newY);

	var snap = !(window.desktopManager && window.desktopManager.isExposé);
	if (snap && this.dragAction.direction) {

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
	} else this.updateExposéDragScale(dialog, newX, newY);

	if (dialog.moveEvents && dialog.exchangeDialogMoveEvent) dialog.exchangeDialogMoveEvent(difference);
};

/**
 * Keep the dragged window's content glued to the cursor during an exposé drag, scaled
 * to whatever is under it: the preview scale of the hovered desktop, or 1:1 when no
 * desktop is under the cursor, so the user sees where letting go will place it.
 * @param {Dialog} dialog
 * @param {number} x
 * @param {number} y
 */
WindowManager.prototype.updateExposéDragScale = function(dialog, x, y) {
	var desktopManager = window.desktopManager;
	if (!desktopManager || typeof dialog._exposeVisualScale !== "number" || !dialog.target || !dialog.content) return;
	var content = dialog.content;
	var grab = dialog._exposeGrab;
	if (!grab) return;

	// The scale the content should have for whatever is under the cursor.
	var index = desktopManager.getDesktopIndexAt(x, y);
	var k = 1;
	if (index >= 0) {
		// The hovered desktop's own preview scale (offsetWidth ignores transforms).
		var desktop = desktopManager.desktops[index];
		if (!desktop) return;
		var desktopTarget = desktop.target;
		var area = desktopTarget.getBoundingClientRect();
		if (area.width && desktopTarget.offsetWidth) k = area.width / desktopTarget.offsetWidth;
	}
	if (!k) k = 1;

	// Animate scale changes through the independent `scale` property, so the position
	// (the `transform` translate below) stays free to track the cursor every move.
	var current = dialog._exposeContentScale || 1;
	if (Math.abs(k - current) >= 0.002) {
		dialog._exposeContentScale = k;
		dialog._exposeVisualScale = k;
		content.style.transition = "scale 280ms cubic-bezier(0.44, 0.41, 0, 1)";
		content.style.scale = String(k);
		if (dialog._exposeScaleTimer) clearTimeout(dialog._exposeScaleTimer);
		dialog._exposeScaleTimer = setTimeout(function() {
			dialog._exposeScaleTimer = 0;
			content.style.transition = "";
		}, 300);
	}

	// Glue the grab point to the cursor from the real rendered geometry, which follows
	// the animated scale even mid-transition. The independent `scale` property composes
	// AFTER the `transform`, so the transform translate is scaled too: divide it out.
	var rendered = content.getBoundingClientRect();
	var targetRect = dialog.target.getBoundingClientRect();
	if (!rendered.width || !targetRect.width) return;
	var renderedScale = dialog._exposeVisualWidth ? rendered.width / dialog._exposeVisualWidth : k;
	if (!renderedScale) return;
	content.style.transform = "translate(" +
		Helpers.toPixels((x - grab.x * renderedScale - targetRect.left) / renderedScale) + "," +
		Helpers.toPixels((y - grab.y * renderedScale - targetRect.top) / renderedScale) + ")";
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
 * @param {HTMLElement | null} [section] The desktop section the gesture belongs to. Its own
 *   frame is what the edges are measured against, so a window on any desktop snaps
 *   to that desktop's edges rather than the first one's.
 * @returns {"" | "maximize" | "left" | "right"}
 */
WindowManager.prototype.getSnapZone = function (x, y, section) {
	var area = section || this.getSnapContainer();
	var rect = area ? area.getBoundingClientRect() : null;
	var left = rect ? rect.left : 0;
	var top = rect ? rect.top : 0;
	var width = rect ? rect.width : this.snapWidth(area);

	// Sides are tested first so a corner resolves to the side rather than maximize:
	// the corner is inside both zones, and half a screen is the more specific offer.
	if (x <= left + this.snapSideThreshold) return "left";
	if (x >= left + width - this.snapSideThreshold) return "right";
	if (y <= top + this.snapFullThreshold) return "maximize";

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
	var drawnHeight = this.snapHeight(this.getSnapContainer(dialog));
	setClass(dialog.target, "height-snapped", false);
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

	var section = this.getSnapContainer(dialog);

	if (direction === 1 || direction === 3) {
		var bounds = WindowManager.windowBounds;
		var threshold = this.snapFullThreshold;
		var atEdge = direction === 1 ?
			dialog.y <= bounds.top + threshold :
			dialog.y + dialog.height >= this.snapHeight(section) - threshold;
		return atEdge ? "height" : "";
	}

	if (direction !== 0) return "";

	return this.getSnapZone(x, y, section);
};

/**
 * The desktop window-section that hosts a dialog's windows. Snapping lays out
 * against whichever section a window already lives in, so a window snapped on any
 * desktop tiles inside that desktop instead of being moved to the first one.
 * @param {Dialog} [dialog]
 * @returns {HTMLElement | null}
 */
WindowManager.prototype.getSnapContainer = function (dialog) {
	var target = dialog && dialog.target;
	if (target && target.closest) {
		var section = /** @type {HTMLElement | null} */ (target.closest("#window-section, .window-section"));
		if (section) return section;
	}
	return document.getElementById("window-section");
};

/**
 * The snap tile group for a desktop's window-section, created on demand.
 * @param {HTMLElement} section
 * @returns {WindowGroup}
 */
WindowManager.prototype.getSnapGroup = function (section) {
	var group = this.snapGroups.get(section);
	if (!group) {
		group = { windows: [] };
		this.snapGroups.set(section, group);
	}
	return group;
};

/** @param {HTMLElement | null} [section] */
WindowManager.prototype.snapWidth = function (section) {
	var area = section || this.getSnapContainer();
	return area ? area.clientWidth : window.innerWidth;
};

/**  @param {HTMLElement | null} [section] */
WindowManager.prototype.snapHeight = function (section) {
	var area = section || this.getSnapContainer();
	return area ? area.clientHeight : window.innerHeight;
};

/**
 * @param {number} x
 * @param {number} y
 */
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
	var section = this.getSnapContainer(dialog);
	if (!section) return;
	var group = this.getSnapGroup(section);
	var windows = /** @type {WindowTile[]} */ (group.windows);

	// Already tiled: the drop just reorders it, so leave its width alone.
	var index = this.findSnapTile(dialog.id, section);
	var tile = index === -1 ? { id: dialog.id, width: 0.5 } : windows[index];

	if (!tile) return;

	if (index !== -1) windows.splice(index, 1);

	if (side === "left") windows.unshift(tile);
	else windows.push(tile);

	if (this.snapInsertGaps) this.fitSnapGaps(section, windows, side);

	// Lay the group out first: the FLIP toggleSnapped runs measures the frame the flex
	// layout produced, so the share has to be in place before the class lands.
	this.reflowSnapGroup(section);
	dialog.toggleSnapped(true);
};

/**
 * Keeps the group either fully tiled or, for a single window, held against the half it
 * was snapped into by a gap. Two windows already fill the area between them, so gaps
 * only ever exist while the group holds one.
 * @param {HTMLElement} section The desktop section the group tiles inside.
 * @param {WindowTile[]} tiles
 * @param {"left" | "right"} [side] Which half the lone window is held in. Read from
 * the window's current offset when omitted.
 */
WindowManager.prototype.fitSnapGaps = function (section, tiles, side) {
	// Clear any gap left from when the group was smaller.
	for (var i = tiles.length - 1; i >= 0; i--) {
		var tile = tiles[i];
		if (tile && tile.gap) tiles.splice(i, 1);
	}

	if (tiles.length !== 1) return;
	var firstTile = tiles[0];
	if (!firstTile || !firstTile.id) return;
	var dialog = this.windows[firstTile.id];
	if (!side && dialog && dialog.target) {
		// The element carries no record of which half it was held in, so the side is read
		// off the box it is drawn at: in the left half of the area it stays left, and the
		// gap has to go on the other side to keep it there.
		var rect = dialog.target.getBoundingClientRect();
		var origin = section.getBoundingClientRect();
		side = rect.left - origin.left <= origin.width / 2 ? "left" : "right";
	}

	// Opposite side: a window snapped right is held there by the gap on its left.
	tiles.splice(side === "right" ? 0 : 1, 0, { gap: true, width: this.snapGapWidth });
};

/**
 * Index of a window's tile in a desktop's snap group, or -1.
 * @param {string} id
 * @param {HTMLElement} section
 */
WindowManager.prototype.findSnapTile = function (id, section) {
	var windows = /** @type {WindowTile[]} */ (this.getSnapGroup(section).windows);

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
	var section = this.getSnapContainer(dialog);
	if (!section) return;
	var group = this.getSnapGroup(section);
	var windows = /** @type {WindowTile[]} */ (group.windows);

	var index = this.findSnapTile(dialog.id, section);
	if (index === -1) return;

	/** @type {"left" | "right" | undefined} */
	var survivorSide;
	if (windows.length === 2 && this.snapInsertGaps) {
		if (index === 0) {
			survivorSide = "right";
		} else if (index === 1) {
			survivorSide = "left";
		}
	}

	windows.splice(index, 1);
	dialog.toggleSnapped(false);

	if (this.snapInsertGaps) this.fitSnapGaps(section, windows, survivorSide);

	this.reflowSnapGroup(section);
};

/**
 * The flex item that holds a gap tile's share of a desktop's snap row. A gap only
 * reserves space, so it is a single empty element per section reused across reflows.
 * @param {HTMLElement} section
 * @returns {HTMLElement}
 */
WindowManager.prototype.getSnapSpacer = function (section) {
	var group = this.getSnapGroup(section);
	if (!group.spacer) {
		group.spacer = document.createElement("div");
		group.spacer.className = "snap-spacer";
	}
	return group.spacer;
};

/**
 * Lays a desktop's snap group out across its own window-section: the section itself is
 * the flex row, so its members are the group's windows in the group's order, each
 * taking the share of the area the group holds for it. That share and the order ride
 * inline on the element, so the window's own geometry state is never written and comes
 * back intact when it leaves the group, and no element is ever reparented — a tiled
 * window holding an iframe is never torn down and reloaded.
 *
 * The layout is scoped to the section the windows already live in, so a snap on any
 * desktop tiles inside that desktop and never moves the window to another one.
 *
 * Every window takes its own width, and gap tiles only reserve space, so a lone tiled
 * window stays at 50% and leaves the rest of the desktop free to drag a second window
 * onto. Clear {@link WindowManager#snapInsertGaps} for a full tiling window manager:
 * no gaps are inserted and the last window soaks up whatever width is left over, so
 * the group always fills the area.
 * @param {HTMLElement} section
 */
WindowManager.prototype.reflowSnapGroup = function (section) {
	var group = this.getSnapGroup(section);
	var tiles = /** @type {WindowTile[]} */ (group.windows);

	// A window whose element is gone, or whose element has moved to another desktop,
	// must not go on taking a share of this group, so its tile goes with it.
	for (var s = tiles.length - 1; s >= 0; s--) {
		var stale = tiles[s];
		if (!stale || stale.gap) continue;
		var staleWindow = stale.id ? this.windows[stale.id] : null;
		if (!staleWindow || !staleWindow.target || !staleWindow.target.parentNode || this.getSnapContainer(staleWindow) !== section) tiles.splice(s, 1);
	}

	/** @type {Record<string, boolean>} */
	var members = {};
	for (var m = 0; m < tiles.length; m++) {
		var memberTile = tiles[m];
		if (memberTile && memberTile.id) members[memberTile.id] = true;
	}

	// A window the group no longer holds goes back to floating and gives up the share
	// it was laid out with. Its element is already a child of the section, which is
	// where every window is created, so there is nothing to move: clearing flex/order
	// drops it back out of the flex row into the absolute box it floats in.
	for (var id in this.windows) {
		var dialog = this.windows[id];
		if (!dialog || !dialog.target || members[id]) continue;
		if (this.getSnapContainer(dialog) !== section) continue;
		dialog.target.style.removeProperty("flex");
		dialog.target.style.removeProperty("order");
	}

	var areaWidth = this.snapWidth(section);
	var areaHeight = this.snapHeight(section);
	var remaining = 1;
	var offset = 0;
	/** @type {HTMLElement | null} */
	var usedSpacer = null;

	for (var k = 0; k < tiles.length; k++) {
		var tile = tiles[k];
		if (!tile) continue;

		var isLast = k === tiles.length - 1;
		// Only a gapless group gives its leftover width to the last window.
		var width = !this.snapInsertGaps && isLast ? remaining : (tile.width || 0.5);
		remaining -= width;

		var member = tile.id ? this.windows[tile.id] : null;
		var element = tile.gap ? this.getSnapSpacer(section) : (member && member.target);
		if (!element) continue;

		if (element.parentNode !== section) section.appendChild(element);

		// The share and the order ride inline. The section distributes its area over the
		// items by these flex weights, so a gap reserves its part without holding a
		// window, and flex order is what lays the tiles out side by side without any
		// DOM movement.
		element.style.order = String(k);
		element.style.flex = width + " 1 0%";
		if (tile.gap) usedSpacer = element;

		// Recorded in pixels as well, so a drag out of the group can remap the grab point
		// out of this frame without measuring the element.
		if (member && !tile.gap) member._snapFrame = {
			x: offset * areaWidth, y: 0, width: width * areaWidth, height: areaHeight
		};

		offset += width;
	}

	// The section's reusable gap spacer goes with the gap it was reserving.
	var spacer = /** @type {HTMLElement | null} */ (group.spacer);
	if (spacer && usedSpacer !== spacer) {
		spacer.style.removeProperty("order");
		spacer.style.removeProperty("flex");
		if (spacer.parentNode) spacer.parentNode.removeChild(spacer);
	}
};

WindowManager.prototype.disableDialogDrag = function() {
	if (this.activeDialog) this.activeDialog._ctrlDrag = false;
	if (!this.isDragging) return;
	// if (flipped) return;
	// The release can outrun the throttled drag frame: the last pointermove of the gesture
	// is still sitting in _pendingDragEvent waiting for its rAF, and that callback runs
	// after this function has already reset dragAction to a plain move — it would then
	// apply the whole cursor delta as a move and teleport the window. Drain the pending
	// frame synchronously, while the gesture direction is still the one the user was
	// resizing with, so the release point is applied as the resize it belongs to. The
	// scheduled rAF finds a null pending event and does nothing.
	if (this._pendingDragEvent && this.activeDialog) {
		var pending = this._pendingDragEvent;
		this._pendingDragEvent = null;
		this.ticking = false;
		var pendingTouch = "pointerType" in pending && pending.pointerType === "touch";
		this.handleWindowDrag(pending.clientX, pending.clientY, pendingTouch);
	}
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

	var snap = !(window.desktopManager && window.desktopManager.isExposé);
	if (snap && dragDirection) {

		var snapZone = this.getGestureSnapZone(this.activeDialog, dragDirection, this.pointerPosition.x, this.pointerPosition.y);
		if (snapZone) this.snapDialog(this.activeDialog, snapZone);

		if (this.isTouchDrag) {
			// this.windowSnap.moveToDialog(this.activeDialog, 0, this.dragAction.direction);
			this.windowSnap.hideBehind(this.activeDialog);
			this.isTouchDrag = false;
		}

		if (!this.activeDialog.maximized) this.windowSnap.hideBehind(this.activeDialog);
		this._snapZone = "";
	} else if (window.desktopManager) {
		// Exposé drop: the window was detached to <main> on drag start — put it back
		// into the desktop that is under the cursor, at the spot it was dropped, or
		// fly it back to where it came from when dropped between desktops.
		var desktopIndex = window.desktopManager.getDesktopIndexAt(this.pointerPosition.x, this.pointerPosition.y);
		if (desktopIndex >= 0) this.activeDialog.dropIntoDesktop(desktopIndex);
		else this.activeDialog.flyBackToExposéOrigin();
		this.isTouchDrag = false;
	}

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
};

/** Share the current theme with the other running OS instances. */
WindowManager.prototype.broadcastTheme = function() {
	if (!document.hasFocus()) return; // only the active tab drives theme sync
	this.broadcast("theme", { className: document.body.className });
};

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
 * Registers an extension with the window manager.
 *
 * An extension is a plain object with optional hooks. The window manager calls the
 * hooks it knows about at the moments they describe; a hook the extension does not
 * implement is simply never called, so an extension only has to provide what it
 * actually needs.
 *
 * Registering an extension that is enabled also enables it, so an extension that
 * has to set something up when it is switched on does not have to do that itself
 * right after registering.
 * @param {Extension} ext
 * @returns {Extension | null} The registered extension, or null when it is not one.
 */
WindowManager.prototype.registerExtension = function(ext) {
	if (!ext || typeof ext !== "object") return null;
	if (typeof ext.enabled !== "boolean") ext.enabled = true;

	// An extension with the same id replaces the old one, so a script that is loaded
	// twice does not end up being called twice.
	if (ext.id) {
		var existing = this.getExtension(ext.id);
		if (existing) this.extensions.splice(this.extensions.indexOf(existing), 1);
	}

	this.extensions.push(ext);

	if (ext.enabled) this.notifyExtension(ext, "onEnable");

	if (ext.flags) Object.defineProperties(flags, ext.flags);

	return ext;
};

/**
 * The registered extension with the given id, or null when there is none.
 * @param {string} id
 * @returns {Extension | null}
 */
WindowManager.prototype.getExtension = function(id) {
	for (var i = 0; i < this.extensions.length; i++) {
		var ext = this.extensions[i];
		if (ext && ext.id === id) return ext;
	}
	return null;
};

/**
 * Switches an extension on or off. The extension's own onEnable and onDisable hooks
 * do the work; the window manager only keeps track of the state and calls them.
 * @param {Extension} ext
 * @param {boolean} enabled
 * @returns {boolean} The state the extension is in now.
 */
WindowManager.prototype.setExtensionEnabled = function(ext, enabled) {
	if (!ext || typeof ext !== "object") return false;
	var value = !!enabled;
	if (!!ext.enabled === value) return value;
	ext.enabled = value;
	this.notifyExtension(ext, value ? "onEnable" : "onDisable");
	return value;
};

/**
 * Calls a hook of a single extension, if it has one. A hook that throws is reported
 * and swallowed: a broken extension must not take the window manager down with it.
 * @param {Extension} ext
 * @param {ExtensionHook} hook
 * @param {Dialog} [dialog]
 */
WindowManager.prototype.notifyExtension = function(ext, hook, dialog) {
	if (!ext || typeof ext !== "object") return;
	var callback = ext[hook];
	if (typeof callback !== "function") return;
	try {
		// @ts-ignore
		callback.call(ext, dialog);
	} catch (ex) {
		console.warn("Extension '" + (ext.id || "unknown") + "' failed on " + hook + ":", ex);
	}
};

/**
 * Calls a hook on every enabled extension that implements it. A hook that throws is
 * reported and skipped, so one broken extension cannot stop the others from being
 * called, nor the window manager from doing its job.
 * @param {ExtensionHook} hook
 * @param {Dialog} [dialog]
 */
WindowManager.prototype.notifyExtensions = function(hook, dialog) {
	for (var i = 0; i < this.extensions.length; i++) {
		var ext = this.extensions[i];
		if (!ext || !ext.enabled) continue;
		this.notifyExtension(ext, hook, dialog);
	}
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

	/**
	 * The desktop section the indicator currently lives in. It is moved into the
	 * section of the window it is previewing, so its insets are measured in that
	 * desktop's own space and it scrolls along with that desktop.
	 * @type {HTMLElement | null}
	 */
	this._section = null;

	// Hidden from the moment it exists: it is an unpositioned, border-only box until the
	// first snap positions it, so without this the first drop flies it in from wherever
	// that box sat rather than from behind the window.
	this.element.classList.add("hidden");
}

Object.defineProperty(WindowSnap.prototype, "hidden", {
	get: function() { return this.element.classList.contains("hidden"); },
	set: function(enable) { if (enable) this.element.classList.add("hidden"); else this.element.classList.remove("hidden"); }
});

WindowSnap.prototype.init = function() {
	var snapParent = (windowManager && windowManager.getSnapContainer()) || document.getElementById("window-section") || document.getElementById("desktop") || document.body;
	this._section = snapParent;
	snapParent.insertBefore(this.element, snapParent.firstChild);
};

/**
 * Puts the indicator into the desktop section of the window it is previewing, so its
 * insets line up with that desktop's coordinate space and it moves with the desktop
 * instead of being pinned to the first one.
 *
 * It goes in first rather than last: it shares the previewed window's z-index, and a
 * later sibling wins that tie, so being the first child is what keeps the frame behind
 * the window it is offering instead of painting its blur over it.
 * @param {Dialog} dialog
 */
WindowSnap.prototype.attachTo = function(dialog) {
	var section = windowManager.getSnapContainer(dialog);
	if (!section) return;
	this._section = section;
	if (this.element.parentNode !== section || section.firstChild !== this.element)
		section.insertBefore(this.element, section.firstChild);
};

/**
 * @param {Dialog} dialog
 * @param {number} [outset]
 * @param {number} [direction]
 * @param {boolean} [noAnimation]
 * @param {boolean} [isTouch]
 * @param {boolean} [preserveSnapped]
 */
WindowSnap.prototype.moveToDialog = function(dialog, outset, direction, noAnimation, isTouch, preserveSnapped) {
	outset = outset || 0;

	this.attachTo(dialog);

	this.hidden = !outset;
	if (!preserveSnapped) this._snapped = "";

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
};

/**
 * @param {number} top
 * @param {number} [left]
 * @param {number} [right]
 * @param {number} [bottom]
 */
WindowSnap.prototype.applyInsetStyle = function(top, left, right, bottom) {
	insetElement(this.element, top, left, right, bottom);
};

/** @param {number} inset */
WindowSnap.prototype.setInset = function(inset) {
	insetElement(this.element, inset);
};

/** Width of the window area the indicator lays out against. */
WindowSnap.prototype.areaWidth = function() {
	var section = this._section || (windowManager && windowManager.getSnapContainer()) || document.getElementById("window-section");
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
};

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

	// Preview in the desktop the window is on, so the offered frame is drawn against
	// that desktop's area and its edges rather than the first desktop's.
	if (dialog) this.attachTo(dialog);

	// Only when the indicator is becoming visible: a switch between two zones keeps it
	// on screen and should morph straight from one geometry to the other. Coming up from
	// hidden it must first sit behind the window the offer is about, with no transition,
	// and commit that frame before the snap animation starts. animateElement sets its
	// target in a rAF, which runs before this frame paints: without the forced reflow the
	// browser coalesces the two inset changes and the indicator animates in from wherever
	// it was last painted instead of from behind the window.
	if (dialog && this.hidden) {
		this.element.classList.remove("animating");
		this.moveToDialog(dialog, 0, undefined, true, false, true);
		void this.element.offsetWidth;
	}

	this.hidden = false;
	// Over the window it is previewing. Without this the indicator keeps whatever
	// z-order the last window it was hidden behind left, and for a window below that
	// one it would sit behind the very thing it is meant to cover.
	if (dialog) this.element.style.zIndex = dialog.z.toString();

	animateElement(this.element, function() {
		switch(type) {
			case "maximize": this.setInset(WindowSnap.margin); break;
			case "left":
			case "right": this.setHalfInset(type); break;
			case "height": this.setHeightInset(dialog); break;
		}
	}, function(name) {
		return name === "inset";
	}, function() {
	}, this);
};

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
};

//#endregion

//#region ClickOffset

/** @class */
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

	/** @type {DragHandler | null} */
	this.dragHandler = null;
}

ClickOffset._overlay = document.createElement("div");
ClickOffset._overlay.className = "drag-overlay";
ClickOffset._overlay.style.display = "block";
/** @param {MouseEvent} [ev] */
ClickOffset.disableOverlay = function (ev) {
	if (ev && ((ev.buttons || ev.which || ev.button) || (window.windowManager && window.windowManager.isDragging))) return;
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
/**
 * @class
 * @param {HTMLElement} target
 */
function Transformable(target) {
	this.target = target;

	/** @type {Transform} */
	this._transform = {};

	this._perspective = 100;
}

Object.defineProperty(Transformable.prototype, "perspective", {
	get: function() { return this._perspective; },
	set: function(value) {
		var parent = this.target.parentElement;
		if (parent) parent.style.perspective = Helpers.toPixels(this._perspective = value); }
});

Transformable.prototype.applyTransform = function() {
	transformElement(this.target, this._transform);
};

/** @param {boolean} [animate] */
Transformable.prototype.update = function(animate) {
	if (animate) animateElement(this.target, this.applyTransform, "transform", undefined, this, 1000);
	else this.applyTransform();
};

/**
 * @param {number} x
 * @param {number} y
 * @param {boolean} [animate]
 */
Transformable.prototype.move = function(x, y, animate) {
	this._transform.x = x;
	this._transform.y = y;

	this.update(animate);
};

/**
 * @param {number} [x]
 * @param {number} [y]
 * @param {boolean} [update]
 * @param {boolean} [animate]
 */
Transformable.prototype.scale = function(x, y, update, animate) {
	this._transform.scaleX = x || 1;
	this._transform.scaleY = y || 1;
	if (update) this.update(animate);
};

/**
 * @param {number} x
 * @param {number} [y]
 * @param {number} [z]
 * @param {boolean} [animate]
 */
Transformable.prototype.rotate = function(x, y, z, animate) {
	if (y === undefined && z === undefined)
		this._transform.rotate = x;
	else {
		this._transform.rotateX = x;
		this._transform.rotateY = y;
		this._transform.rotateZ = z;
	}

	this.update(animate);
};

//#region Dialog


/**
 * A window that can be moved around and resized and stuff.
 * @author Lasse Lauwerys
 * @param {HTMLElement | Application} [object] This is a dialog element from the HTML structure, or an object that defines the properties of the window.
 * @class
 */
function Dialog(object) {

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

	/** @type {boolean} */
	this._useTransform = useTransform;
	this._useScale = useScale;

	this._skew = 0;
	this._scaleX = 0;
	this._scaleY = 0;
	this._rotation = 0;

	/** @type {Transformable | null} */
	this._transform = null;

	/** @type {Transformable | null} */
	this._contentTransform = null;

	/** How long the touch-drag downscale animates for, in ms. Must match the transform transition in windows.css; after it elapses the drag stops animating. */
	this.dragScaleDuration = 280;
	/** @type {boolean} True while the touch-drag downscale is playing, so the drag handlers do not strip the "animating" class out from under it. */
	this._dragScaleAnimating = false;

	this._maximizing = false;
	this.maximizeAnimations = 0;

	/** @type {boolean} */
	this.fixed = false;


	/** Tracks the persisted open/closed state. The isOpen property is backed by a CSS class that gets applied asynchronously in a requestAnimationFrame, so it cannot be used for saving state synchronously! */
	this._stateOpen = false;
	/** @constant */
	this._bodyOffset = { width: 0, height: 0, x: 0, y: 0 };

	/** @type {{_fsTimeout: number | null, _fsRaf: number | null, _fsToken: number | null, _fsTokenAtStart: number | null }} @const */
	this._animationProps = { _fsTimeout: 0, _fsRaf: null, _fsToken: null, _fsTokenAtStart: null };

	if (!object) return;

	var id = object.id;

	/** @type {Application | null} */
	this.application = null;
	if (!Helpers.isElement(object))
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
	this.clickOffset = new ClickOffset;


	var appList = document.getElementById("applist");
	if (appList) appList.appendChild(this.createOpenButton());

	var metroAppList = document.getElementById("metroapplist");
	if (metroAppList) metroAppList.appendChild(this.createOpenButton());

	this._popupPositionInterval = 0;

	this.dragging = false;
	this._ctrlDrag = false;

	/** @type {HTMLImageElement| null} */
	this._appIcon = null;

	var self = this;
	/**
	 * @param {MouseEvent | PointerEvent} ev
	 * @param {number} [id]
	 */
	this.activationHandler = function (ev, id) {
		self._ctrlDrag = !!ev.ctrlKey;
		if (ev.ctrlKey) {
			ev.stopImmediatePropagation();
			return;
		}
		if (ev.target instanceof HTMLElement && ev.target.classList.contains("touch") && (!("pointerType" in ev) || ev.pointerType !== "touch"))
			return false;
		windowManager.windowActivationEvent(ev, self, id);
		return true;
	};

	if (object instanceof Dialog) {
		if (object.application) object = object.application;
	}

	/** @type {HTMLElement} */
	this.target;

	/** @type {boolean} */
	this.moveEvents = false;

	/** @type {boolean} */
	this.scroll = false;

	if (!(object instanceof Dialog)) {
		if (Helpers.isElement(object)) {
			this.target = object;
			if (this.target.parentElement && this.target.parentElement.nodeName === "TEMPLATE") return;
			this.close();
		} else {

			this.application = object;

			this.target = object.exists && document.getElementById(object.id) ||  createDialogElement();
			// return;
			if (this.windowTarget) this.windowTarget.dialog = this;

			if (object.classes && typeof object.classes === "object"){
				object.classes.forEach(function (clazz) { this.target && this.target.classList.add(clazz); }, this); // `class` is a reserved keyword.
			}
			this.setTitle(object.title);
			this.fixed = object.fixed || false;
			this.scroll = object.scroll|| false;
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

	var buttons = target.getElementsByTagName("button");

	var createSizers = true;

	if(this.resizable && createSizers) this._createSizers();

	// target.addEventListener("dragstart", cancelDomEvent, false);
	target.addEventListener("selectstart", function (event) {
		if (self._ctrlDrag) return;
		cancelDomEvent(event);
	}, false);

	var body = this.body;
	if (body) body.addEventListener("load", function () { try {
		self.verifyEjectCapability();
	} catch (exception) {
		console.log(exception);
		if (buttons[0]) buttons[0].style.display = "none";
	}}, false);

	var header = this.titleBar;
	if (header) target.addEventListener("dblclick", function (event) {
		var rect = getRect(header);
		if (!rect || event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return;

		var node = event.target instanceof HTMLElement ? event.target : null;
		while (node && node !== header) {
			if (node.nodeName && node.nodeName.toLowerCase() === "button") return;
			node = node.parentElement;
		}
		self.toggleMaximized();
	}, false);


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

	target.addEventListener("dragstart", function (event) {
		if (!(event.ctrlKey || self._ctrlDrag) || !event.dataTransfer || !self.application) {
			event.preventDefault();
			return;
		}

		/** @type {DialogDropState} */
		var dragState = {
			state: self.getState(),
			app: self.application
		};

		// Remember where inside the window the pointer grabbed it, so a drop can put
		// the window back under the cursor exactly where the drag preview showed it.
		var rect = getRect(self.target);
		if (rect) dragState.offset = {
			x: event.clientX - (rect.left + rect.width / 2),
			y: event.clientY - (rect.top + rect.height / 2)
		};

		var data = JSON.stringify(dragState);
		var transfer = event.dataTransfer;

		if (rect && typeof transfer.setDragImage === "function") {
			try { transfer.setDragImage(self.target, event.clientX - rect.left, event.clientY - rect.top); } catch (ex) { console.log(ex); }
		}

		try {
			transfer.setData("application/json", data);
			transfer.setData("text/plain", self.src || self.title || self.id);
			if (self.src) transfer.setData("text/uri-list", self.src);
			transfer.setData("text/html", data);
		} catch(ex) {
			transfer.setData("Text", data);
			if (self.src) transfer.setData("URL", self.src);
		}

		transfer.effectAllowed = "copyMove";

	}, false);

	target.addEventListener("dragend", function () {
		self._ctrlDrag = false;
	}, false);

	if (this.id) windowManager.windows[this.id] = this;

	this.updateUseTransform(this.useTransform);
	this.updateScale(this.useScale);
	this.update();

	if (!Helpers.isElement(object))
		if (object instanceof Dialog)
			this.move(object.x, object.y);
		else this.moveToCenter(window.innerWidth / 2, window.innerHeight / 2);

	// if (this.application && this.application.launch) this.launch();

	if (this.frame) this.frame.addEventListener("load", function() { self._loaded = true; }, false);


	if(!this.scroll && this.body) this.body.style.overflow = "hidden";

	this.originalBody = this.body;

	if(!this.scroll && this.body) this.body.style.overflow = "hidden";
};

/**
 * @param {string} name
 * @param {Element} [parent]
 */
Dialog.prototype.getElementByTagOrClassName = function (name, parent) {
	var target = parent || this.target;
	var elements = target.getElementsByTagName(name);
	if (!elements || !elements.length) elements = target.getElementsByClassName(name);
	var element = elements.length ? elements[0] : null;
	if (Helpers.isElement(element)) return element;
	return null;
};

/** @param {HTMLElement} element */
Dialog.prototype.setParentElement = function(element) {
	var target = this.target;
	if (target.parentNode === element) return;

	if (typeof element.moveBefore === "function" && target.isConnected) try {
		return element.moveBefore(target, null);
	} catch (ex) { console.warn("Not eligible for a move (e.g. a shadow root): use the compatible path.", ex); }

	element.appendChild(target);
};

/** @param {number} i */
Dialog.prototype.moveToDesktop = function(i){
	if (this.snapped && windowManager) windowManager.unsnapDialog(this);
	if (window.desktopManager) {
		var desktop = window.desktopManager.desktops[i];
		if (desktop) desktop.insertWindow(this);
	}
};

/**
 * Detach the window to the given root (e.g. <main>) for an exposé drag while keeping it
 * visually exactly where it was: the desktop's preview scale is undone by an inverse
 * scale+translate on the content element. Everything is measured, not derived.
 * @param {HTMLElement} root
 */
Dialog.prototype.detachToRootKeepingVisual = function(root) {
	var target = this.target;
	var before = target.getBoundingClientRect();
	this.setParentElement(root);
	var after = target.getBoundingClientRect();
	if (!before.width || !after.width) return;
	var scale = before.width / after.width;
	var content = this.content;
	if (!content || !scale) return;

	// Scale the content back to the preview size it had on the desktop, then measure
	// where it actually renders and translate it onto the pre-move rect exactly. The
	// scale lives in the independent `scale` property so it can transition on its own
	// while the translate keeps tracking the cursor every move. The independent
	// `scale` composes AFTER the `transform`, so the translate is scaled too: divide.
	content.style.transformOrigin = "0 0";
	content.style.scale = String(scale);
	var measured = content.getBoundingClientRect();
	content.style.transform = "translate(" +
		Helpers.toPixels((before.left - measured.left) / scale) + "," +
		Helpers.toPixels((before.top - measured.top) / scale) + ")";

	this._exposeVisualScale = scale;
	this._exposeContentScale = scale;
	this._exposeVisualWidth = after.width;
};

/** Remove the exposé inverse transform left on the content element, if any. */
Dialog.prototype.clearExposéVisual = function() {
	/** @type {Coord & {index:number} | null} */
	this._exposeOrigin = null;
	if (typeof this._exposeVisualScale !== "number") return;
	var content = this.content;
	if (content) {
		content.style.transform = "";
		content.style.transformOrigin = "";
		content.style.scale = "";
		content.style.transition = "";
	}
	if (this._exposeScaleTimer) {
		clearTimeout(this._exposeScaleTimer);
		this._exposeScaleTimer = 0;
	}
	this._exposeVisualScale = undefined;
	this._exposeVisualWidth = undefined;
	this._exposeContentScale = undefined;
	/** @type {Coord | null} */
	this._exposeGrab = null;
};

/**
 * Drop the window into desktop i, landing it on the new desktop at the exact spot it
 * visually appeared at under the cursor.
 * @param {number} i
 */
Dialog.prototype.dropIntoDesktop = function(i) {
	var visualLeft = null, visualTop = null, unscaledWidth = this._exposeVisualWidth;
	// Where the window currently looks like it is: the rendered content rect.
	if (this.content) {
		var rendered = this.content.getBoundingClientRect();
		if (rendered.width) visualLeft = rendered.left, visualTop = rendered.top;
	}
	this.moveToDesktop(i);
	this.clearExposéVisual();
	if (visualLeft === null || visualTop === null || !this.target || !unscaledWidth) return;
	// Map the visual drop position back through the new desktop's preview scale.
	var placed = this.target.getBoundingClientRect();
	if (!placed.width) return;
	var desktopScale = placed.width / unscaledWidth;
	if (!desktopScale) return;
	this.move(this.x + (visualLeft - placed.left) / desktopScale, this.y + (visualTop - placed.top) / desktopScale);
};

/** Reinsert the window into the desktop it was dragged from and animate it back to its pre-drag position there. */
Dialog.prototype.flyBackToExposéOrigin = function() {
	var origin = this._exposeOrigin;
	this.clearExposéVisual();
	if (!origin || !window.desktopManager) return;
	var desktop = window.desktopManager.desktops[origin.index];
	if (!desktop) return;
	desktop.insertWindow(this);
	this.move(origin.x, origin.y, false);
	this.animate(this.updatePosition);
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
		if (!sizer || !(Helpers.isElement(sizer))) sizer = document.createElement("div");
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
			if (!touchSizer || !Helpers.isElement(touchSizer)) touchSizer = document.createElement("div");

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
});
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
			this.target.style.height = Helpers.toPixels(height);
			this.updateTransform();
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
			this.target.style.width = Helpers.toPixels(width);
			this.updateTransform();
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
		return this.target.classList.contains("maximized");
	},
	set: function(maximized) { this.toggleMaximized(maximized); }
});

Object.defineProperty(Dialog.prototype, "snapped", {
	get: function() {
		return this.target.classList.contains("snapped");
	},
	set: function(snapped) { this.toggleSnapped(snapped); }
});

Object.defineProperty(Dialog.prototype, "heightSnapped", {
	get: function() {
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
		this.target.setAttribute("id", id);
	}
});

Object.defineProperty(Dialog.prototype, "content", {
	get: function() {
		return this.getElementByTagOrClassName("content");
	}
});

Object.defineProperty(Dialog.prototype, "contentTransform", {
	/** @type {()=>Transformable | null} */
	get: function() {
		if (this._contentTransform) return this._contentTransform;
		var content = this.content;
		if (!content) return null;
		return this._contentTransform = new Transformable(content);
	}
});

Object.defineProperty(Dialog.prototype, "transform", {
	/** @type {()=>Transformable | null} */
	get: function() { return this._transform || (this._transform = new Transformable(this.target)); }
});

Object.defineProperty(Dialog.prototype, "killable", {
	get: function() { return this.application !== null; }
});

Object.defineProperty(Dialog.prototype, "borderSize", {
	set: function (value) {
		if (!this.content) return;
		this.content.style.padding = Helpers.toPixels(value);
		this.content.style.border = Helpers.toPixels(value);
		this.content.style.borderRadius = Helpers.toPixels(value);
	},
	get: function () { return this.content && fromPixels(this.content.style.padding); }
});

Object.defineProperty(Dialog.prototype, "popup", {
	get: function() { return this._popupWindow; }
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
		if (self._appIcon) self._appIcon.className = "loaded";
	};

	this._appIcon.onerror = function (e) {
		if (self._appIcon) self._appIcon.className = "";
		console.warn(e);
		if (onError) onError();
	};

	this._appIcon.src = iconUrl;
};

/** @param {number} skew */
Dialog.prototype.setSkew = function(skew) {
	this._skew = skew;
	if (this.useTransform) this.updateTransform();
};
/**
 * @param {number} [scaleX]
 * @param {number} [scaleY]
 * @param {boolean} [update]
 * @param {boolean} [noAnimation]
 */
Dialog.prototype.setScale = function(scaleX, scaleY, update, noAnimation) {
	if (this.transform) this.transform.scale(scaleX, scaleY, update !== false, !noAnimation);
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

	var application = this.application;
	if (application && application.multiple) {
		// Multi-instance apps open a fresh window from their button instead of
		// re-focusing the single registered one.
		openButton.onclick = function () {
			if (!application) return;
			var instance = windowManager.spawnApp(application);
			if (instance) instance.launch();
		};
	} else {
		openButton.onclick = this.launch.bind(this);
	}
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
	this.target.classList.remove("animating");
};

/**
 * @param {(this:Dialog)=>void} [onToggled]
 * @param {TransitionEndCallback} [onTransitionEnd]
 * @param {(this:Dialog)=>void} [onEnd]
 * @param {number} [timeout]
 * @param {boolean} [flip] Play the toggled change as a FLIP (see {@link flipElement}).
 */
Dialog.prototype.animate = function (onToggled, onTransitionEnd, onEnd, timeout, flip) {
	animateElement(this.target, onToggled, onTransitionEnd, onEnd, this, timeout, flip);
};
/**
 * @param {string} className
 * @param {boolean} [force]
 * @param {TransitionEndCallback} [onTransitionEnd]
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
 * Same as {@link Dialog#toggleClassAnimated}, but plays the class change as a FLIP.
 * Used for tiling, where the class switches the window between absolute positioning and
 * an in-flow flex item: a layout-model change no transition can interpolate on its own.
 * @param {string} className
 * @param {boolean} [force]
 * @param {TransitionEndCallback} [onTransitionEnd]
 * @param {(this:Dialog,enabled:boolean)=>void} [onEnd]
 * @param {number} [timeout]
 */
Dialog.prototype.toggleClassFlip = function (className, force, onTransitionEnd, onEnd, timeout) {
	var self = this;
	var enabled = false;
	this.animate(function() {
		enabled = setClass(self.target, className, force);
	}, onTransitionEnd, function() { if (onEnd) onEnd.call(self, enabled); }, timeout, true);
};

/**
 * Tiled state, the sibling of maximized: purely visual, so the window keeps its own
 * width/height/position and returns to them untouched when it leaves the group. The
 * window stays a child of #window-section the whole time; the class only switches it
 * between the absolute box it floats in and a flex item of the section's snap row.
 *
 * The switch is played as a FLIP rather than a plain transition, because occupying a
 * different layout box is not something the browser can interpolate: the frames are
 * measured either side of the change and the old one is eased back over the new one.
 * @param {boolean} [enable]
 */
Dialog.prototype.toggleSnapped = function (enable) {
	var target = this.target;
	if (enable === null) enable = !target.classList.contains("snapped");
	if (target.classList.contains("snapped") === enable) return;

	// Leaving the group has to survive the drag's own animation cancelling, so it is
	// exempt from stopAnimating the same way the drag scale-down already is. Without
	// this the window drops to floating in one frame instead of easing out, because the
	// next pointermove cancels the transition.
	this._snappingOut = !enable;
	this._snappingOutState = null;

	this.toggleClassFlip("snapped", enable, function (name) {
		// The FLIP rides on translate and scale, so either settling means the switch
		// has arrived.
		return name === "translate" || name === "scale";
	}, function () {
		this._snappingOut = false;
		this._snappingOutState = null;
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
	if (enable === null) enable = !target.classList.contains("height-snapped");
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

/** @param {boolean} [enable] */
Dialog.prototype.toggleMaximized = function (enable) {

	if (typeof enable !== "boolean") enable = !this.maximized;
	if (this.maximized === enable) return;

	// Maximized and tiled both claim the whole area, so they cannot overlap. Full-height
	// snap claims the vertical half of it, and the grab point for maximizing is recorded
	// against the maximized frame, so it has to go before the geometry is remapped.
	if (enable && this.snapped && windowManager) windowManager.unsnapDialog(this);
	if (enable && this.heightSnapped) this.toggleHeightSnapped(false);

	var self = this;
	var target = this.target;
	var content = this.content;

	this.setZ();

	// Only the active tab broadcasts; background tabs apply (guarded by focus + synchronizing).
	this.broadcastState({ maximized: enable === true });

	this.maximizeAnimations++;

	// View Transitions path (Chrome 111+)
	if (flags.useViewTransitionMaximize && this.windowTarget)
		return this.windowTarget.toggleMaximizedVT(enable);

	// Fallback path for legacy browsers without CSS transitions (e.g. IE9)
	if (!supportsTransitions) {
		var startPos = self.position;
		var startSize = self.size;
		enable = !target.classList.contains("maximized");
		var toggleMaximizedFallback = function () {
			self.x = startPos.x;
			self.y = startPos.y;
			self.width = startSize.x;
			self.height = startSize.y;
			self.target.classList.toggle("maximized", enable);
		};
		if (!enable) toggleMaximizedFallback();
		Anim.animate(300, function (t) {
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
		}, function () {
			if (enable) toggleMaximizedFallback();
			self.maximizeAnimations--;
		});
		return;
	}

	// Standard class-animated path (when compositor resize is disabled)
	if (!flags.compositorResize || !this.useTransform) {
		this.toggleClassAnimated("maximized", enable, function (name) {
			return name === "transform" || name === "width";
		}, undefined, function (isMaximized) {
			if (this.useTransform && this.target) this.toggleMinSizeConstraints(isMaximized);
			self.maximizeAnimations--;
		}, 1000);
		return;
	}

	// Compositor-accelerated resize path:
	// A scale transform applied with CSS that transitions both translation and scale
	// on the compositor thread. When maximizing, it eases from the window's floating
	// position/size to the snap container. When unmaximizing/restoring, the animation
	// switches around and downscales the element rather than upscaling (FLIP-style),
	// easing from full screen to the floating frame before releasing the maximized class.
	if (!flags.useAnimations) {
		target.classList.toggle("maximized", enable);
		target.classList.toggle("scaled-max", enable);
		target.style.pointerEvents = "";
		this._maximizing = enable;
		this.setScale(1, 1, undefined, true);
		this.updateTransform();
		if (this.useTransform) this.toggleMinSizeConstraints(enable);
		this.maximizeAnimations--;
		return;
	}

	if (this._compositorMaxState) {
		this._compositorMaxState.cancel();
		this._compositorMaxState = null;
	}

	var windowSection = windowManager ? windowManager.getSnapContainer(this) : null;
	var endWidth = windowSection ? windowSection.clientWidth : window.innerWidth;
	var endHeight = windowSection ? windowSection.clientHeight : window.innerHeight;
	var startWidth = this.width || target.offsetWidth || 300;
	var startHeight = this.height || target.offsetHeight || 200;
	var startX = this.x;
	var startY = this.y;

	var scaleX = startWidth > 0 ? endWidth / startWidth : 1;
	var scaleY = startHeight > 0 ? endHeight / startHeight : 1;

	var isSlow = document.body && document.body.classList.contains("slow-animations");
	var duration = isSlow ? 3000 : 280;

	var toTransform = function (x, y, sx, sy) {
		return "translate(" + Helpers.toPixels(x) + "," + Helpers.toPixels(y) + ") scale(" + sx + "," + sy + ")";
	};

	var state = {
		active: true,
		raf: 0,
		timer: 0,
		/** @type {((e: TransitionEvent) => void) | null} */
		endHandler: null,
		cancel: function () {
			if (!this.active) return;
			this.active = false;
			if (this.raf) cancelAnimationFrame(this.raf);
			if (this.timer) clearTimeout(this.timer);
			if (this.endHandler) target.removeEventListener("transitionend", this.endHandler, false);
			target.style.removeProperty("transition");
			target.style.transformOrigin = "";
			target.style.pointerEvents = "";
			target.classList.remove("animating");
			if (content) {
				content.style.width = "";
				content.style.height = "";
			}
			self.maximizeAnimations--;
		}
	};
	this._compositorMaxState = state;

	var finishCompositorMaximize = function () {
		if (!state.active) return;
		state.active = false;
		if (state.timer) clearTimeout(state.timer);
		if (state.endHandler) target.removeEventListener("transitionend", state.endHandler, false);
		self._compositorMaxState = null;

		target.classList.remove("animating");
		target.style.removeProperty("transition");
		target.style.transformOrigin = "";
		target.style.pointerEvents = "";
		if (content) {
			content.style.width = "";
			content.style.height = "";
		}

		if (enable) {
			target.classList.add("maximized", "scaled-max");
			self._maximizing = true;
		} else {
			target.classList.remove("maximized", "scaled-max");
			self._maximizing = false;
		}

		self.setScale(1, 1, undefined, true);
		self.updateTransform();
		if (self.useTransform && target) self.toggleMinSizeConstraints(enable);
		self.maximizeAnimations--;
	};

	state.endHandler = function (e) {
		if (e.target === target && (e.propertyName === "transform" || !e.propertyName)) {
			finishCompositorMaximize();
		}
	};
	target.addEventListener("transitionend", state.endHandler, false);
	state.timer = setTimeout(finishCompositorMaximize, duration + 100);

	target.style.transformOrigin = "top left";
	target.style.pointerEvents = "none";

	if (enable) {
		// Maximizing:
		// Starts unmaximized at floating frame, scales up and translates to snap container.
		target.classList.add("scaled-max");
		target.classList.remove("maximized");
		target.style.setProperty("transition", "none", "important");
		target.style.transform = toTransform(startX, startY, 1, 1);
		void target.offsetWidth;

		state.raf = requestAnimationFrame(function () {
			state.raf = 0;
			if (!state.active) return;
			target.classList.add("animating");
			target.style.removeProperty("transition");
			target.style.transform = toTransform(0, 0, scaleX, scaleY);
		});
	} else {
		// Restoring (unmaximizing):
		// Starts maximized at full screen, downscales and translates toward floating frame.
		target.classList.add("maximized", "scaled-max");
		target.style.setProperty("transition", "none", "important");
		target.style.transform = toTransform(0, 0, 1, 1);
		void target.offsetWidth;

		state.raf = requestAnimationFrame(function () {
			state.raf = 0;
			if (!state.active) return;
			target.classList.add("animating");
			target.style.removeProperty("transition");
			target.style.transform = toTransform(startX, startY, 1 / scaleX, 1 / scaleY);
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

/**
 * @param {boolean} [animate]
 */
Dialog.prototype.updateTransform = function (animate) {
	if (!(this.useTransform && this.transform)) return;

	if (this._maximizing) this.transform.move(0, 0, animate);
	else this.transform.move(this.x, this.y, animate);
};

Dialog.prototype.updatePosition = function() {
	if (this.useTransform) this.updateTransform();
	else this.setInset(this.top, this.left, this.right, this.bottom);

	if (flags.useSkewAnimations) {
		var deltaX = this.x - this._previousX, deltaY = this.y - this._previousY;

		var intensity = 1;

		this.skew = -deltaX * intensity / 3;
		this.scaleY = 1 - deltaY * intensity / 100;
	}

	windowManager.notifyExtensions("onWindowMove", this);
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
	// An exposé drag floats the window free of the screen/desktop bounds: the clamp
	// happens again on the drop, when the window is back inside a desktop.
	if (typeof this._exposeVisualScale !== "number") {
		var bounds = WindowManager.windowBounds;
		if (x < bounds.left) x = bounds.left;
		if (bounds.right !== Infinity && x > bounds.right - this.width) x = bounds.right - this.width;
		if (y < bounds.top) y = bounds.top;
		if (bounds.bottom !== Infinity && y > bounds.bottom - this.height) y = bounds.bottom - this.height;
	}
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
 * Move the dialog so its center point lands at the provided coordinates. I  ggotta renname thifunc
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
	if (Helpers.isElement(this.target))
		this.target.style.zIndex = String(this._z);
	if (previous !== this._z) this.broadcastState({ z: this._z });
};
Dialog.prototype.updateWidth = function () {
	if (this.useTransform) this.target.style.width = Helpers.toPixels(this._width);
	else this.target.style.right = Helpers.toPixels(this.right);
};
Dialog.prototype.updateHeight = function () {
	if (this.useTransform) this.target.style.height = Helpers.toPixels(this._height);
	else this.target.style.bottom = Helpers.toPixels(this.bottom);
};
/**
 * @param {"width"|"height"} axis
 * @param {number} size
 * @param {boolean} [update]
 * @param {boolean} [animate]
 */
Dialog.prototype._setSize = function (axis, size, update, animate) {
	if (typeof size !== "number" || axis === "height" && !this.target) return;
	var isWidth = axis === "width";
	var bounds = WindowManager.windowBounds;
	var far = isWidth ? bounds.right : bounds.bottom;
	var near = isWidth ? bounds.left : bounds.top;
	var pos = isWidth ? this.x : this.y;
	if (far !== Infinity) {
		var overflow = pos + size - far;
		if (overflow > 0) {
			var newPos = pos - overflow;
			if (near !== undefined && newPos < near) newPos = near;
			if (isWidth) this.move(newPos); else this.move(this.x, newPos);
		}
		size = Math.min(size, far - (isWidth ? this.x : this.y));
	}
	if (isWidth) {
		this._width = Math.max(Math.min(size, this.maxWidth), this.minWidth);
		this._isMinWidth = this._width === this.minWidth;
	} else {
		this._height = Math.max(Math.min(size, this.maxHeight), this.minHeight);
		this._isMinHeight = this._height === this.minHeight;
	}
	if (update !== false) {
		if (animate) this.animate(isWidth ? this.updateWidth : this.updateHeight);
		else if (isWidth) this.updateWidth(); else this.updateHeight();
	}
};
/**
 * @param {number} width
 * @param {boolean} [update]
 * @param {boolean} [animate]
 */
Dialog.prototype.setWidth = function (width, update, animate) { this._setSize("width", width, update, animate); };
/**
 * @param {number} height
 * @param {boolean} [update]
 * @param {boolean} [animate]
 */
Dialog.prototype.setHeight = function (height, update, animate) { this._setSize("height", height, update, animate); };

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
 * @param {number} newW
 * @param {number} newH
 * @param {number} newX
 * @param {number} newY
 * @param {number} oldX
 * @param {number} oldY
 * @param {number} minW
 * @param {number} minH
 */
Dialog.prototype._commitResize = function (newW, newH, newX, newY, oldX, oldY, minW, minH) {
	this._width = newW;
	this._height = newH;
	this._isMinWidth = newW === minW;
	this._isMinHeight = newH === minH;
	if (newX !== oldX || newY !== oldY) this.move(newX, newY);
	this.updateWidth();
	this.updateHeight();
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

	this._commitResize(newW, newH, newX, newY, oldX, oldY, minW, minH);
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
	if (this.useScale) insetElement(this.target, top, left);
	else insetElement(this.target, top, left, right, bottom);
};

/** @param {string} [url] */
Dialog.prototype.openUrl = function(url) {
	var frame = this.getOrCreateFrame(true);
	if (!frame) return;

	var self = this;
	var timeout = -1;

	frame.onload = function() {
		clearTimeout(timeout);
		self.reportState();
	};

	if (!this.application) return;

	var baseUrls = [url || this.src, this.application.distSrc];

	if (!isLocal) baseUrls.reverse();

	var fallbackUrls = baseUrls.concat(this.application.altUrls);

	var index = 0;

	function tryNext() {
		// Skip over missing entries (e.g. an app with no distSrc/altUrls) and stop at
		// the end. The old code recursed on an undefined url, which re-entered forever.
		var url;
		while (index < fallbackUrls.length && !(url = fallbackUrls[index++]));
		if (!url || !frame) return;

		frame.src = url;
		self._src = url;

		clearTimeout(timeout);
		timeout = setTimeout(tryNext, 3000);
	}

	frame.addEventListener("error", tryNext, false);

	tryNext();
};

Dialog.prototype.refresh = function() { if (this.frame) this.openUrl(this.frame.src); };

Dialog.prototype.launch = function() {
	// TODO: initstate cuz it might nt have to init again to open
	if (!this.isOpen) this.insertIntoDOM();
	windowManager.notifyExtensions("onWindowLaunch", this);

	this.open();
};

Dialog.prototype.kill = function() {
	var parent = this.target && this.target.parentElement;
	if (parent && this.killable && this.target) parent.removeChild(this.target);
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

	this._popupWindow = window.open(this.href, this.title || "LVOS", Helpers.stringifyWindowOpenProperties({
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

			self.moveBody(x, y);
			prevRect.x = outerX;
			prevRect.y = outerY;
		}

		if (width !== prevRect.width || height !== prevRect.height) {
			self.resizeBody(width, height);
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
	if (useScale) {
		target.style.right = "";
		target.style.bottom = "";
		this.toggleMinSizeConstraints(this.maximized);
	} else {
		if (this.useTransform) return;
		target.style.right = Helpers.toPixels(this.right);
		target.style.bottom = Helpers.toPixels(this.bottom);
	}
	target.classList.toggle("use-scale", useScale);

	this.update();
};

/** @param {boolean} [isMaximized] */
Dialog.prototype.toggleMinSizeConstraints = function(isMaximized) {
    this.target.style.minWidth = isMaximized ? "100%" : Helpers.toPixels(this.minWidth);
    this.target.style.minHeight = isMaximized ? "100%" : Helpers.toPixels(this.minHeight);
};

/** @param {boolean} [enable] */
Dialog.prototype.flip = function(enable) {
	this.toggleClassAnimated("flipped", enable);
};

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
	if ("open" in state) {
		if (state.open) this.launch();
		else this.toggleOpen(false);
	}
	if ("title" in state) this.title = state.title;
	if ("x" in state || "y" in state)
		this.move("x" in state ? state.x : this.x, "y" in state ? state.y : this.y);
	if ("z" in state && typeof state.z === "number") this.setZ(state.z);
	if ("width" in state || "height" in state)
		this.resize("width" in state ? state.width : this.width, "height" in state ? state.height : this.height);
	if ("maximized" in state) this.toggleMaximized(state.maximized === true);
};

Dialog.prototype.exportDialogBodyToMetro = function() {};
/** @param {string} id */
Dialog.prototype.getElementById = function(id) {
	var doc = this.contentDocument;
	return doc && doc.getElementById(id);
};
Dialog.prototype.insertIntoDOM = function() {
	var container = document.getElementById("window-section");
	if (container) container.appendChild(this.target);
};
/**
 * Moves an element of the window into a picture-in-picture window.
 * @param {string} id The id of the element
 * @param {string} [stylesheet] The stylesheet the pip window should use
 */
Dialog.prototype.moveElementIntoPipById = function(id, stylesheet) {
	var targetElement = this.getElementById(id);
	if (targetElement && Modern) Modern.toggleElementPip(targetElement, function (window) {
		window.onresize = function() {
			if (!(targetElement instanceof HTMLCanvasElement)) return;
			targetElement.width = targetElement.clientWidth;
			targetElement.height = targetElement.clientHeight;
		};
	}, stylesheet);
};

Dialog.prototype.screenshot = function() {
	var shooter = getScreenShooter();
	if (shooter) shooter.screenshotElement(this.target);
};

//#endregion

//#region DragAction

/** @class */
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

//#region Event Listeners

window.addEventListener("resize", WindowManager.recalculateWindowBounds, false);
window.addEventListener("load", WindowManager.recalculateWindowBounds, false);

window.addEventListener(supportsPointer? "pointermove" : "mousemove", ClickOffset.handleMouseDrag, false);
window.addEventListener("unload", function() { windowManager && windowManager.saveState(); }, false);
window.addEventListener("dragover", cancelDomEvent, false);
window.addEventListener("drop", function(e) {
	e.preventDefault();
}, false);

//#endregion

//#region Global Variables

var windowManager = new WindowManager;
window.windowManager = windowManager;
windowManager.isWindowUpdatesEnabled = true;

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