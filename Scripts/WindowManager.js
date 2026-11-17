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

var useTransform = true, useScale = false;

var isLocal = location.protocol === "file:" || location.hostname === "localhost";
var allowUpdateRateLimit = false;

if (!capabilities.supportsTransform) useTransform = false;
if (document.documentMode && document.documentMode < 9) allowUpdateRateLimit = false;
if (document.documentMode && document.documentMode < 8) useScale = true;

var flags = {
	aeroSnap: true,
	updateRateLimit: allowUpdateRateLimit,
	useDragOverlay: true,
	broadcastWindowMoves: !document.documentMode,
	useAnimations: true,
	ieDropCompatibleMode: true,
	bootAnimation: true,
	_useTransform: useTransform,
	get useTransform() { return this._useTransform; },
	set useTransform(value) {
		this._useTransform = value;
		windowManager.forEachWindow(function(dialog) { dialog.useTransform = value; });
	},
	_useScale: useScale,
	get useScale() { return this._useScale; },
	set useScale(value) {
		this._useScale = value;
		windowManager.forEachWindow(function(dialog) { dialog.useScale = value; });
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
	verboseLogs: false,
	_exposeAndDesktops: true,
	get exposeAndDesktops() { return this._exposeAndDesktops; },
	set exposeAndDesktops(value) {
		this._exposeAndDesktops = value;
		if (window.desktopManager && typeof window.desktopManager.setExposéEnabled === "function")
			window.desktopManager.setExposéEnabled(value);
	},
	_enableExtensions: true,
	get enableExtensions() { return this._enableExtensions; },
	set enableExtensions(value) {
		window.windowManager.extensions.forEach(function(ext) {
			window.windowManager.toggleExtensionEnabled(ext, value);
		});
	}
};

//#region Window Manager

/** @class */
function WindowManager() {

	/** @type {DialogMap} @const */
	this._windows = {};
	/** @type {DesktopState | null} */
	this._windowStates = null;

	this._isWindowUpdatesEnabled = false;

	this.isDragging = false;
	/** @constant */
	this.dragAction = new DragAction;
	/** @type {number} */
	this.snapFullThreshold = 30;
	/** @type {number} */
	this.snapSideThreshold = 30;
	/** @type {number} */
	this.heightSnapReleaseThreshold = 10;
	/** @type {number} */
	this.snapGapWidth = 0.5;
	/** @type {boolean} */
	this.snapInsertGaps = true;
	/** @type {"" | "maximize" | "left" | "right" | "height"} */
	this._snapZone = "";
	/** @type {Coord} */
	this.pointerPosition = { x: 0, y: 0 };
	/** @type {boolean} */
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

	this.channel = "BroadcastChannel" in window && new BroadcastChannel("lvos") || null;

	if (this.channel) this.channel.onmessage = function(ev) {
		var data = ev.data;
		if (typeof data === "string") try { data = JSON.parse(data); } catch (ex) { return console.warn(ex); }
		if (!data || typeof data !== "object" || typeof data.type !== "string") return;
		windowManager.handleBroadcast(data.type, data.data, data.id);
	};

	/** @type {WindowManager} */
    var self = this;
	this.resizeHandler = function() {
		WindowManager.updateWindowRect();
		self.forEachWindow(function (window) { window.update(); });
	};

	/** @param {PointerEvent | MouseEvent} event */
	this.windowDragEvent = function(event) {
		try {
			if (event && !event.which && !event.button && event.buttons === 0 && self.isDragging)
				return  self.disableDialogDrag();
			Helpers.cancelDomEvent(event);

			var isTouch = "pointerType" in event && event.pointerType === "touch";

			self.setPointerPosition(event.clientX, event.clientY);

			if (flags.updateRateLimit) {
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
	/** @type {Map<Element, WindowGroup>} */
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
		} catch (ex) { console.warn(ex); }
		return this._windowStates;
	}
});

Object.defineProperty(WindowManager.prototype, "state", {
	get: function () {
		/** @type {DesktopState} */
		var state = {};
		windowManager.forEachWindow(function (window, id) { state[id] = window.getState(); });
		return state;
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

/** @param {number} topZ */
WindowManager.prototype.setTopZ = function(topZ) { this.topZ = topZ; };
WindowManager.prototype.saveState = function() {
	if (!this.loaded || window.top !== window.self) return;
	try { if (this.canSave && "localStorage" in window) localStorage.setItem("windowState", JSON.stringify(this.state)); }
	catch (exception) { handleStorageException(exception); }
};

/** @param {Dialog} [dialog] */
WindowManager.prototype.loadState = function(dialog) {
	// TODO: cache per-dialog state in memory on creation and restore from there instead of re-parsing localStorage each call
	if (!this.canSave || !("localStorage" in window)) return;
	try {
		var windowStates = this.windowStates;
		this.loaded = true;
		if (!windowStates) return;
		if (dialog && dialog.id) {
			dialog.loadState(windowStates[dialog.id]);
			this.updateTopZ(dialog.z);
		} else {
			for (var id in windowStates) if (windowStates.hasOwnProperty(id)) try {
				var d = this.windows[id];
				if (d && windowStates[id]) d.loadState(windowStates[id]);
			} catch (ex) { console.warn(ex); }
			this.updateTopZ();
		}
	} catch (exception) { handleStorageException(exception); }
};

/**
 * @overload
 * @param {WindowCallback<WindowManager>} callback
 * @returns {void}
 */
/**
 * @template T
 * @overload
 * @param {WindowCallback<T>} callback
 * @param {T} thisArg
 * @returns {void}
 */
/**
 * @this {WindowManager}
 * @param {WindowCallback<any>} callback
 * @param {any} [thisArg]
 */
WindowManager.prototype.forEachWindow = function (callback, thisArg) {
	var context = thisArg || this;
	for (var id in this.windows) if (this.windows.hasOwnProperty(id)) {
		var dialog = this.windows[id];
		if (dialog && callback.call(context, dialog, id)) break;
	}
};

WindowManager.prototype.synchronizeStates = function () { this.forEachWindow(function(dialog) { dialog.reportState(); }); };

/**
 * @param {HTMLElement} element
 * @returns {Application}
 */
WindowManager.prototype.createAppFromElement = function(element) {
	return { id: element.id, exists: true };
};

/** @param {Application} application */
WindowManager.prototype.loadApp = function(application) {
	try {
		var dialog = new Dialog(application);
		this._windows[application.id] = dialog;
		appManager.addApp(application);
		return dialog;
	} catch(ex) { console.warn("App load failed", ex); return null; }
};

/**
 * @param {Application} application
 * @returns {Dialog | null}
 */
WindowManager.prototype.spawnApp = function(application) {
	if (!application || !application.id) return null;

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
	var application = { src: url, id: id || "custom." + getDomain(url), title: title || getSiteName(url) || "unkle" };
	if (iconUrl) application.iconUrl = iconUrl;
	this.loadApp(application);
	this.saveInstalledApp(application);
};

Object.defineProperty(WindowManager.prototype, "installedApps", {
	get: function() {
		if (typeof localStorage === "undefined") return [];
		try {
			var string = localStorage.getItem("installedApps");
			if (!string) return [];
			var apps = JSON.parse(string);
			return apps instanceof Array ? apps : [];
		} catch (ex) { console.warn(ex); return []; }
	}
});

/** @param {Application} application */
WindowManager.prototype.saveInstalledApp = function(application) {
	if (!this.canSave || typeof localStorage === "undefined") return;
	try {
		var apps = this.installedApps;
		for (var i = 0; i < apps.length; i++) if (apps[i].id === application.id) return;
		apps.push(application);
		localStorage.setItem("installedApps", JSON.stringify(apps));
	} catch (exception) { handleStorageException(exception); }
};

WindowManager.prototype.loadInstalledApps = function() {
	if (!this.canSave || typeof localStorage === "undefined") return;
	try { this.installedApps.forEach(function(app) { if (app && app.src) this.loadApp(app); }, this); }
	catch (exception) { handleStorageException(exception); }
};
/**
 * @param {string} url
 * @param {string} [proxyUrl]
 */
WindowManager.prototype.installAppProxied = function (url, proxyUrl) {
	if (!proxyUrl) proxyUrl = "https://browz.netlify.app/browz-set-cookie/";
	this.installApp(proxyUrl + url, Helpers.getSiteName(url) || "unkle", "custom." + Helpers.getDomain(url), Helpers.getFaviconUrl(url));
};

/**
 * @param {Application} application
 * @param {number} x Pointer position when the drag was dropped, in pixels.
 * @param {number} y Pointer position when the drag was dropped, in pixels.
 * @param {Coord} [offset] Pointer position relative to the window centre when the drag started.
 * @param {Partial<DialogState>} [state] The saved state that was dragged with the window.
 */
WindowManager.prototype.dropApplication = function (application, x, y, offset, state) {
	if (!application || !application.id) return null;

	var dialog;
	if (application.multiple)
		dialog = this.spawnApp(application);
	else {
		dialog = this.windows[application.id];
		if (!dialog) {
			this.loadApp(application);
			dialog = this.windows[application.id];
		}
	}
	if (!dialog) return null;

	dialog.target.classList.remove("animating");

	if (typeof x === "number" && typeof y === "number")
		dialog.moveCenterTo(x - (offset ? offset.x : 0), y - (offset ? offset.y : 0), false);

	void dialog.target.offsetLeft;

	if (!state) state = {};

	state.x = dialog.x, state.y = dialog.y;

	dialog.loadState(state || {});

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
WindowManager.windowRectInset = { top: 0, left: -100, right: -100, bottom: -100 };

WindowManager._windowRect = { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 };

WindowManager.updateWindowRect = function () {
	var rect = WindowManager._windowRect;
	rect.width = window.innerWidth || (document.documentElement && document.documentElement.clientWidth) || (document.body && document.body.clientWidth) || 0;
	rect.height = window.innerHeight || (document.documentElement && document.documentElement.clientHeight) || (document.body && document.body.clientHeight) || 0;
	var inset = WindowManager.windowRectInset;
	rect.top = inset.top !== null ? inset.top : -Infinity;
	rect.left = inset.left !== null ? inset.left : -Infinity;
	rect.right = inset.right !== null ? rect.width - inset.right : Infinity;
	rect.bottom = inset.bottom !== null ? rect.height - inset.bottom : Infinity;
};

WindowManager.updateWindowBounds = WindowManager.updateWindowRect;

Object.defineProperty(WindowManager, "windowRect", {
	get: function () { return WindowManager._windowRect; }
});

/** @param {Dialog} dialog */
WindowManager.prototype.focusDialog = function(dialog) {
	if (this.focusedDialog !== null && this.focusedDialog.target)
		this.focusedDialog.target.removeAttribute("focus");
	dialog.target.setAttribute("focus", String(true));
	this.focusedDialog = dialog;
};

WindowManager.prototype.initializeDialogs = function() {
	var self = this;
	var stop = function() { self.disableDialogDrag(); };
	var event = capabilities.supportsPointer ? "pointerup" : "mouseup";
	if (typeof document !== "undefined") document.addEventListener(event, stop, false);
	if (typeof window !== "undefined") window.addEventListener(event, stop, false);
	if (!capabilities.supportsPointer && typeof document !== "undefined")
		document.addEventListener("mouseup", stop, false);
	if (!capabilities.supportsPointer && typeof window !== "undefined")
		window.addEventListener("mouseup", stop, false);

	this.dragAction.set(0);
	if (typeof document !== "undefined") {
		var dialogs = document.getElementsByClassName("window");
		for (var i = 0; i < dialogs.length; i++) {
			var element = dialogs[i];
			if (Helpers.isElement(element))
				self.loadApp(self.createAppFromElement(element));
		}
	}
	this.loadState();

	if (this.windowSnap && typeof this.windowSnap.init === "function") this.windowSnap.init();
};

/**
 * @param {MouseEvent | PointerEvent} event
 * @param {Dialog} dialog
 * @param {number} [id]
 */
WindowManager.prototype.windowActivationEvent = function(event, dialog, id) {
	try {
		var node = event && (event.target || event.srcElement);
		var isInteractive = false;
		while (node && Helpers.isElement(node) && node.nodeType === 1) {
			var tn = (node.tagName || "").toLowerCase();
			if (tn === "input" || tn === "textarea" || tn === "select" || tn === "button" || tn === "a" || tn === "label" || tn === "output") { isInteractive = true; break; }
			if (node.hasAttribute && node.hasAttribute("contenteditable")) { isInteractive = true; break; }
			node = node.parentElement;
		}
		if (isInteractive) { try { dialog.focus(); } catch (ex) {} return dialog; }
	} catch (ex) {}

	Helpers.cancelDomEvent(event);

	if (window.desktopManager && window.desktopManager.isExposé) {
		var root = document.querySelector("main");
		if (root) {
			var section = dialog.target.closest("#window-section, .window-section"), origin = -1;
			if (section) for (var i = 0; i < window.desktopManager.desktops.length; i++) {
				var d = window.desktopManager.desktops[i];
				if (d && d.target === section) { origin = i; break; }
			}
			dialog._exposeOrigin = origin >= 0 ? { index: origin, x: dialog.x, y: dialog.y } : null;
			dialog.detachToRootKeepingVisual(root);
		}
	} else dialog.clearExposéVisual();

	if (capabilities.supportsPointer && event && "pointerId" in event && event.target instanceof HTMLElement && typeof event.target.setPointerCapture === "function") try {
		event.target.setPointerCapture(event.pointerId);
	} catch (ex) { console.warn(ex); }
	this.activeDialog = dialog;
	this.isTouchDrag = event && "pointerType" in event && event.pointerType === "touch";
	this.enableDialogDrag();
	this.dragAction.set(id || 0);
	dialog.setClickOffset(event.clientX, event.clientY);
	dialog.activate();
	if (this.isTouchDrag) this.windowSnap.moveToDialog(dialog, 0, this.dragAction.direction, true, this.isTouchDrag);
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
	if (!this.isDragging) return;
	var dialog = this.activeDialog;
	if (!dialog || !dialog.clickOffset) return;

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
	var difference = { x: newX - dialog.clickOffset.clickPosition.x, y: newY - dialog.clickOffset.clickPosition.y };

	if (dialog.heightSnapped) {
		var gestureDirection = this.dragAction.direction;
		if (gestureDirection === 0) {
			if (difference.y > this.heightSnapReleaseThreshold) dialog.toggleHeightSnapped(false);
		} else if (gestureDirection && this.isVerticalResizeDirection(gestureDirection)) {
			this.leaveHeightSnappedByResize(dialog);
		}
	}

	dialog.stopAnimating();

	var dragScale = typeof dialog._exposeVisualScale === "number" && dialog._exposeVisualScale > 0 ? dialog._exposeVisualScale : 1;
	if (typeof dialog._exposeVisualScale === "number" && !dialog._exposeGrab && dialog.clickOffset && dialog.content) {
		var grabRect = dialog.content.getBoundingClientRect();
		if (grabRect.width) dialog._exposeGrab = {
			x: (dialog.clickOffset.clickPosition.x - grabRect.left) / dragScale,
			y: (dialog.clickOffset.clickPosition.y - grabRect.top) / dragScale
		};
	}
	this.dragAction.execute(dialog, dialog.clickOffset, dragScale === 1 ? difference : { x: difference.x / dragScale, y: difference.y / dragScale });

	this.setPointerPosition(newX, newY);

	var snap = !(window.desktopManager && window.desktopManager.isExposé);
	if (snap) {

		var snapZone = this.getGestureSnapZone(dialog, this.dragAction.direction, newX, newY);
		if (snapZone) {
			if (snapZone !== this._snapZone) {
				if (this._snapZone) this.windowSnap.hideBehind(dialog, !!isTouch);
				this._snapZone = snapZone;
				this.windowSnap.snap(snapZone, dialog);
			}
		} else if (this._snapZone) {
			this._snapZone = "";
			this.windowSnap.hideBehind(dialog, !!isTouch);
		} else if (isTouch) {
			this.windowSnap.moveToDialog(dialog, 20, this.dragAction.direction, true, true);
		}
	} else this.updateExposéDragScale(dialog, newX, newY);

	if (dialog.moveEvents && dialog.exchangeDialogMoveEvent) dialog.exchangeDialogMoveEvent(difference);
};

/**
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

	var index = desktopManager.getDesktopIndexAt(x, y);
	var k = 1;
	if (index >= 0) {
		var desktop = desktopManager.desktops[index];
		if (!desktop) return;
		var desktopTarget = desktop.target;
		var area = desktopTarget.getBoundingClientRect();
		if (area.width && desktopTarget.offsetWidth) k = area.width / desktopTarget.offsetWidth;
	}
	if (!k) k = 1;

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
 * @param {number} x Pointer position.
 * @param {number} y Pointer position.
 * @param {HTMLElement | null} [section] The desktop section the gesture belongs to. Its own frame is what the edges are measured against, so a window on any desktop snaps to that desktop's edges rather than the first one's.
 * @returns {"" | "maximize" | "left" | "right"}
 */
WindowManager.prototype.getSnapZone = function (x, y, section) {
	var area = section || this.getSnapContainer();
	var rect = area ? area.getBoundingClientRect() : null;
	var left = rect ? rect.left : 0;
	var top = rect ? rect.top : 0;
	var width = rect ? rect.width : this.snapWidth(area);

	if (x <= left + this.snapSideThreshold) return "left";
	if (x >= left + width - this.snapSideThreshold) return "right";
	if (y <= top + this.snapFullThreshold) return "maximize";

	return "";
};

/** @param {number} direction */
WindowManager.prototype.isVerticalResizeDirection = function (direction) {
	return direction === 1 || direction === 3 || direction === 5 || direction === 6 || direction === 7 || direction === 8;
};

/** @param {Dialog} dialog */
WindowManager.prototype.leaveHeightSnappedByResize = function (dialog) {
	var drawnHeight = this.snapHeight(this.getSnapContainer(dialog));
	Helpers.setClass(dialog.target, "height-snapped", false);
	dialog._endSnapTransition();
	this._heightSnapReleased = true;

	dialog._y = 0;
	dialog._height = drawnHeight;
	dialog.updatePosition();
	dialog.updateHeight();

	var offset = dialog.clickOffset;
		offset.height = dialog.height;
		offset.startX = dialog.x;
		offset.startY = dialog.y;
};

/**
 * @param {Dialog} dialog
 * @param {number} direction The gesture's drag direction, read before it is reset. Only ever unset before a gesture has set one, and an unset direction claims nothing.
 * @param {number} x Pointer position.
 * @param {number} y Pointer position.
 * @returns {"" | "maximize" | "left" | "right" | "height"}
 */
WindowManager.prototype.getGestureSnapZone = function (dialog, direction, x, y) {
	if (!flags.aeroSnap || dialog.heightSnapped || this._heightSnapReleased) return "";

	var section = this.getSnapContainer(dialog);

	if (direction === 1 || direction === 3) {
		var bounds = WindowManager.windowRect;
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
 * @param {Dialog} [dialog]
 * @returns {HTMLElement | null}
 */
WindowManager.prototype.getSnapContainer = function (dialog) {
	var target = dialog && dialog.target;
	var section = target && target.closest && /** @type {HTMLElement | null} */ (target.closest("#window-section, .window-section"));
	return section || document.getElementById("window-section");
};

/**
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
	return area ? area.clientWidth : Helpers.getViewportWidth();
};

/**  @param {HTMLElement | null} [section] */
WindowManager.prototype.snapHeight = function (section) {
	var area = section || this.getSnapContainer();
	return area ? area.clientHeight : Helpers.getViewportHeight();
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
 * @param {Dialog} dialog
 * @param {"" | "maximize" | "left" | "right" | "height"} zone
 */
WindowManager.prototype.snapDialog = function (dialog, zone) {
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
 * @param {Dialog} dialog
 * @param {"left" | "right"} side Which end of the group it joins.
 */
WindowManager.prototype.tileDialog = function (dialog, side) {
	var section = this.getSnapContainer(dialog);
	if (!section) return;
	var group = this.getSnapGroup(section);
	var windows = /** @type {WindowTile[]} */ (group.windows);

	var index = this.findSnapTile(dialog.id, section);
	var tile = index === -1 ? { id: dialog.id, width: 0.5 } : windows[index];

	if (!tile) return;

	if (index !== -1) windows.splice(index, 1);

	if (side === "left") windows.unshift(tile);
	else windows.push(tile);

	if (this.snapInsertGaps) this.fitSnapGaps(section, windows, side);

	this.reflowSnapGroup(section);
	dialog.toggleSnapped(true);
};

/**
 * @param {HTMLElement} section The desktop section the group tiles inside.
 * @param {WindowTile[]} tiles
 * @param {"left" | "right"} [side] Which half the lone window is held in. Read from the window's current offset when omitted.
 */
WindowManager.prototype.fitSnapGaps = function (section, tiles, side) {
	for (var i = tiles.length - 1; i >= 0; i--) {
		var tile = tiles[i];
		if (tile && tile.gap) tiles.splice(i, 1);
	}

	if (tiles.length !== 1) return;
	var firstTile = tiles[0];
	if (!firstTile || !firstTile.id) return;
	var dialog = this.windows[firstTile.id];
	if (!side && dialog && dialog.target) {
		var rect = dialog.target.getBoundingClientRect();
		var origin = section.getBoundingClientRect();
		side = rect.left - origin.left <= origin.width / 2 ? "left" : "right";
	}

	tiles.splice(side === "right" ? 0 : 1, 0, { gap: true, width: this.snapGapWidth });
};

/**
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

/** @param {Dialog} dialog */
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

/** @param {HTMLElement} section */
WindowManager.prototype.reflowSnapGroup = function (section) {
	var group = this.getSnapGroup(section);
	var tiles = /** @type {WindowTile[]} */ (group.windows);

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

	for (var id in this.windows) if (this.windows.hasOwnProperty(id)) {
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
		var width = !this.snapInsertGaps && isLast ? remaining : (tile.width || 0.5);
		remaining -= width;

		var member = tile.id ? this.windows[tile.id] : null;
		var element = tile.gap ? this.getSnapSpacer(section) : (member && member.target);
		if (!element) continue;

		if (element.parentNode !== section) section.appendChild(element);

		element.style.order = String(k);
		element.style.flex = width + " 1 0%";
		if (tile.gap) usedSpacer = element;

		if (member && !tile.gap) member._snapFrame = {
			x: offset * areaWidth, y: 0, width: width * areaWidth, height: areaHeight
		};

		offset += width;
	}

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
	if (this._pendingDragEvent && this.activeDialog) {
		var pending = this._pendingDragEvent;
		this._pendingDragEvent = null;
		this.ticking = false;
		var pendingTouch = "pointerType" in pending && pending.pointerType === "touch";
		this.handleWindowDrag(pending.clientX, pending.clientY, pendingTouch);
	}
	var dragDirection = this.dragAction.direction;
	this.dragAction.set();
	this.toggleDragging(false);
	this.saveState();
	if (!this.activeDialog) return;

	if (this.isTouchDrag) this.activeDialog.setDragScale(1, 1);

	var snap = !(window.desktopManager && window.desktopManager.isExposé);
	if (snap) {

		var snapZone = this.getGestureSnapZone(this.activeDialog, dragDirection, this.pointerPosition.x, this.pointerPosition.y);
		if (snapZone) this.snapDialog(this.activeDialog, snapZone);

		if (this.isTouchDrag) {
			this.windowSnap.hideBehind(this.activeDialog);
			this.isTouchDrag = false;
		}

		if (!this.activeDialog.maximized) this.windowSnap.hideBehind(this.activeDialog);
		this._snapZone = "";
	} else if (window.desktopManager) {
		var desktopIndex = window.desktopManager.getDesktopIndexAt(this.pointerPosition.x, this.pointerPosition.y);
		if (desktopIndex >= 0) this.activeDialog.dropIntoDesktop(desktopIndex);
		else this.activeDialog.flyBackToExposéOrigin();
		this.isTouchDrag = false;
	}

	if (!this.activeDialog.moveEvents) return;

	var func = this.activeDialog.exchangeDialogMouseUpEvent;
	func();
};

WindowManager.prototype.enableDialogDrag = function() {
	this.toggleDragging(true);
};

/** @param {number} [newZ]  */
WindowManager.prototype.updateTopZ = function(newZ) {
	if (typeof newZ === "number")
		this.topZ = Math.max(this.topZ, newZ + 1);
	else this.forEachWindow(function(dialog) {
		if (dialog && dialog.z >= this.topZ) this.setTopZ(dialog.z + 1);
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
	if (this.channel) LVMessenger.broadcast(this.channel, type, data, id);
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
		document.body.className = className;
		return this.forEachWindow(function(dialog) { dialog.messageFrame("theme", { className: className }); });
	}
	if (type !== "dialog-state")
		return messageReceived(type, data, id);
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
	try { dialog.loadState(data); } finally {}
};

/**
 * @param {HTMLElement} el
 * @returns {Dialog | null}
 */
WindowManager.prototype.getWindowOwningElement = function(el) {
	/** @type {Dialog | null} */
	var foundDialog = null;
	this.forEachWindow(function(dialog) {
		if (dialog.body !== el) return;
		foundDialog = dialog;
		return true;
	});
	return foundDialog;
};

/**
 * @param {Extension} extension
 * @returns {Extension | null} The registered extension, or null when it is not one.
 */
WindowManager.prototype.registerExtension = function(extension) {
	if (!extension || typeof extension !== "object") return null;
	if (typeof extension.enabled !== "boolean") extension.enabled = true;

	if (extension.id) {
		var existing = this.getExtension(extension.id);
		if (existing) this.extensions.splice(this.extensions.indexOf(existing), 1);
	}

	this.extensions.push(extension);

	if (extension.enabled) this.notifyExtension(extension, "onEnable");
	if (extension.flags) Object.defineProperties(flags, extension.flags);

	return extension;
};

/**
 * @param {string} id
 * @returns {Extension | null}
 */
WindowManager.prototype.getExtension = function(id) {
	return this.extensions.find(function(ext) { return ext.id === id; }) || null;
};

/**
 * @param {Extension} ext
 * @param {boolean} [enabled]
 */
WindowManager.prototype.toggleExtensionEnabled = function(ext, enabled) {
	if (!ext || typeof ext !== "object") return false;
	if (typeof enabled === "undefined") enabled = !ext.enabled;
	if (ext.enabled === enabled) return enabled;
	ext.enabled = enabled;
	this.notifyExtension(ext, enabled ? "onEnable" : "onDisable");
	return enabled;
};

/**
 * @param {Extension} ext
 * @param {ExtensionHook} hook
 * @param {Dialog} [dialog]
 */
WindowManager.prototype.notifyExtension = function(ext, hook, dialog) {
	if (!ext || typeof ext !== "object") return;
	var callback = /** @type {((this: Extension, dialog?: Dialog) => void)} */(ext[hook]);
	if (typeof callback === "function") try {
		callback.call(ext, dialog);
	} catch (ex) {
		console.warn("Extension '" + (ext.id || "unknown") + "' failed on " + hook + ":", ex);
	}
};

/**
 * @overload
 * @param {NoArgHook} hook
 * @returns {void}
 */
/**
 * @overload
 * @param {DialogHook} hook
 * @param {Dialog} dialog
 * @returns {void}
 */
/**
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
 * @param {MessageType} type
 * @param {any} data
 * @param {string} [source]
 */
function messageReceived(type, data, source){

	switch (type) {
		case "os": return /** @type {VulpOS} */{ windowManager: windowManager };
	}

	if (source) {

		var dialog = windowManager.windows[source];

		if (!dialog) return;

		if (type === "window-size") dialog.resizeBody(data.width, data.height); // Client dictates its size; window wraps around the client area.
		switch (type) {
			case "launchOverlay":
				var overlay = Helpers.getOverlay();
				if (!overlay) break;

				overlay.ontransitionend = function() {
					if (!dialog) return;
					dialog.messageFrame("prepareToLaunchOverlay");
					if (dialog.frame) {
						var oriel = new URL(dialog.frame.src);
						oriel.searchParams.set("fullscreen", String(true));
						dialog.frame.src = oriel.href;
					}
					if (!overlay) return;
					overlay.ontransitionend = null;
					if (typeof overlay.requestFullscreen === "function") overlay.requestFullscreen()["catch"](function() {});
					if (dialog.body) overlay.appendChild(dialog.body);
					window.setTimeout(overlay.classList.add.bind(overlay.classList, "shown"), 500);
				};
				overlay.classList.toggle("open");
				break;
			case "readyToLaunchOverlay":
				var overlay1 = Helpers.getOverlay();
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
};

/** @type {number} */
WindowSnap.margin = 15;

function WindowSnap() {
	this.element = document.createElement("div");
	this.element.id = "window-snap";
	this._snapped = "";

	/** @type {HTMLElement | null} */
	this._section = null;

	if (document.documentMode && document.documentMode < 9) return;

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

/** @param {Dialog} dialog */
WindowSnap.prototype.attachTo = function(dialog) {
	var section = windowManager.getSnapContainer(dialog);
	if (!section) return;
	this._section = section;
	if (this.element.parentNode !== section || section.firstChild !== this.element)
		section.insertBefore(this.element, section.firstChild);
};

WindowSnap._sides = [
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
	var s = (WindowSnap._sides[direction || 0] || WindowSnap._sides[0]);
	if (!s) return;
	var top = dialog.top - (s.top ? outset : 0);
	var left = dialog.left - (s.left ? outset : 0);
	var right = dialog.right - (s.right ? outset : 0);
	var bottom = dialog.bottom - (s.bottom ? outset : 0);

	this.element.style.zIndex = dialog.z.toString();
	this.hidden = false;
	if (isTouch && !direction) dialog.setDragScale(0.9, 0.9);
	var self = this;
	var apply = function() { Helpers.insetElement(self.element, top, left, right, bottom); }.bind(this);
	if (!noAnimation) Helpers.animateElement(this.element, apply, "top", undefined, this, 500);
	else apply();
};

/** @param {number} inset */
WindowSnap.prototype.setInset = function(inset) { Helpers.insetElement(this.element, inset); };

WindowSnap.prototype.areaWidth = function() {
	var section = this._section || (windowManager && windowManager.getSnapContainer()) || document.getElementById("window-section");
	return section ? section.clientWidth : Helpers.getViewportWidth();
};

/** @param {"left" | "right"} side */
WindowSnap.prototype.setHalfInset = function(side) {
	var half = Math.round(this.areaWidth() / 2), inset = WindowSnap.margin;
	Helpers.insetElement(this.element, inset, side === "left" ? inset : half + inset, side === "left" ? half + inset : inset, inset);
};

/** @param {Dialog} dialog */
WindowSnap.prototype.setHeightInset = function(dialog) {
	var inset = WindowSnap.margin;
	Helpers.insetElement(this.element, inset, Math.max(inset, dialog.x - inset), Math.max(inset, this.areaWidth() - dialog.x - dialog.width - inset), inset);
};

/**
 * @param {"maximize" | "left" | "right" | "height"} type
 * @param {Dialog} dialog The window the offer is about, which the full-height indicator frames and the others only need for their z-order.
 */
WindowSnap.prototype.snap = function(type, dialog) {

	if (type === this._snapped) return;
	this._snapped = type;

	this.attachTo(dialog);

	if (dialog && this.hidden) {
		this.element.classList.remove("animating");
		this.moveToDialog(dialog, 0, undefined, true, false, true);
		void this.element.offsetWidth;
	}

	this.hidden = false;
	this.element.style.zIndex = dialog.z.toString();

	Helpers.animateElement(this.element, function() {
		switch(type) {
			case "maximize": this.setInset(WindowSnap.margin); break;
			case "left":
			case "right": this.setHalfInset(type); break;
			case "height": this.setHeightInset(dialog); break;
		}
	}, "inset", undefined, this);
};

/**
 * @param {Dialog} dialog
 * @param {boolean} [keepScale] Skip the scale reset, for a touch drag still in progress.
 */
WindowSnap.prototype.hideBehind = function(dialog, keepScale) {
	if (!keepScale) dialog.setDragScale(1, 1);

	if (this.hidden) return;

	Helpers.animateElement(this.element, function() {
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
	/** @type {Coord} */
	this.clickPosition = { x: 0, y: 0 };
	this.height = 0;
	this.width = 0;
	this.startY = 0;
	this.startX = 0;
	this.start = 0;
	this.last = 0;
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
	var o = ClickOffset._overlay;
	if (o.remove) o.remove(); else if (o.parentNode) o.parentNode.removeChild(o);
};
["mousemove", "mouseup", "mouseout"].forEach(function(t) { window.addEventListener(t, ClickOffset.disableOverlay, false); });

ClickOffset.prototype.reset = function () {
	this.start = this.last = Date.now();
	this.position.x = this.position.y = 0;
	return this;
};
/** @param {number} x @param {number} y */
ClickOffset.prototype.update = function(x, y){
	this.last = Date.now();
	this.position.x = x, this.position.y = y;
	var lastPosition = this.position.clone();
	this.difference = this.lastPosition.clone().sub(this.position);
	this.lastPosition = lastPosition;
	return this;
};
ClickOffset.prototype.clear = function () { this.clickPosition.x = 0; this.clickPosition.y = 0; };
/** @param {number} x @param {number} y @param {number} [width] @param {number} [height] @param {number} [startX] @param {number} [startY] */
ClickOffset.prototype.init = function (x, y, width, height, startX, startY) {
	this.reset(); this.clickPosition.x = x; this.clickPosition.y = y;
	if (typeof width === "number" && typeof height === "number" && typeof startX === "number" && typeof startY === "number") {
		this.width = width; this.height = height; this.startX = startX; this.startY = startY;
	}
	return this;
};
/** @param {boolean} enable @param {(ev:PointerEvent|MouseEvent)=>void} handler @param {Cursor} [cursor] */
ClickOffset.toggleDragEventHandler = function (enable, handler, cursor) {
	document[enable ? "addEventListener" : "removeEventListener"](capabilities.supportsPointer ? "pointermove" : "mousemove", handler, false);
	if (!flags.useDragOverlay || !this._overlay)
		return windowManager.forEachWindow(function(dialog) { dialog.togglePointerEvents(!enable); });
	this._overlay.style.cursor = cursor || "";
	if (enable) document.body.appendChild(this._overlay); else this.disableOverlay();
};
/** @param {boolean} enable @param {Cursor} [cursor] */
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
		if (parent) parent.style.perspective = Helpers.toPixels(this._perspective = value);
	}
});

Transformable.prototype.applyTransform = function() {
	Helpers.transformElement(this.target, this._transform);
};

/** @param {boolean} [animate] */
Transformable.prototype.update = function(animate) { if (animate) Helpers.animateElement(this.target, this.applyTransform, "transform", undefined, this, 1000); else this.applyTransform(); };
/** @param {number} x @param {number} y @param {boolean} [animate] */
Transformable.prototype.move = function(x, y, animate) { this._transform.x = x; this._transform.y = y; this.update(animate); };
/** @param {number} [x] @param {number} [y] @param {boolean} [update] @param {boolean} [animate] */
Transformable.prototype.scale = function(x, y, update, animate) { this._transform.scaleX = x || 1; this._transform.scaleY = y || 1; if (update) this.update(animate); };
/** @param {number} x @param {number} [y] @param {number} [z] @param {boolean} [animate] */
Transformable.prototype.rotate = function(x, y, z, animate) {
	if (y === undefined && z === undefined) this._transform.rotate = x;
	else { this._transform.rotateX = x; this._transform.rotateY = y; this._transform.rotateZ = z; }
	this.update(animate);
};


//#region Dialog

/** @param {unknown} exception */
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
	return content.children ? content.children[0] : content.childNodes[1];
};

/** @returns {HTMLElement | WindowElement} */
function createDialogElement() {
	var template = getDialogTemplate();
	if (!template) throw new Error("Can't find dialog template!");
	return /** @type {HTMLElement} */(template.cloneNode(true));
};

var windowButtons = {
	eject: 0,
	full: 1,
	close: 2
};

/**
 * @author Lasse Lauwerys
 * @param {Application} application
 * @class
 */
function Dialog(application) {

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

	this.velocityTracking = false;
	this.velocityX = 0;
	this.velocityY = 0;
	this._minWidth = 200;
	this._minHeight = 40;
	this._maxWidth = 2000;
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

	/** @type {Application} */
	this.application = application;

	this._title = application.title;

	if (application.minWidth) this._minWidth = application.minWidth;
	if (application.minHeight) this._minHeight = application.minHeight;

	var id = application.id || application.title || "";

	this._id = id;
	/** @type {HTMLButtonElement[]} */
	this.buttons = [];
	this.clickOffset = new ClickOffset;

	/** @type {HTMLElement} */
	this.target;

	if (application.exists) {
		var element = id && document.getElementById(id);
		if (!element) throw new Error("Couldn't find a window in DOM with ID: " + id + ". Cannot create a dialog off oof existing DOM without one existing. (exists = true on application someone said).");
		this.target = element;
	} else this.target = createDialogElement();

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
	 * @param {MouseEvent | PointerEvent} [ev]
	 * @param {number} [id]
	 */
	this.activationHandler = function (ev, id) {
		var target = ev && ev.target;
		if (!ev) {
			var event = window.event;
			if (event) {
				target = event.srcElement;
				ev = /** @type {MouseEvent} */(event);
			}
			if (!ev) return;
		}
		self._ctrlDrag = !!(ev && ev.ctrlKey);
		if (self._ctrlDrag) {
			ev.stopImmediatePropagation();
			return;
		}

		if (target instanceof HTMLElement && target.classList.contains("touch") && (!("pointerType" in ev) || ev.pointerType !== "touch"))
			return false;
		windowManager.windowActivationEvent(ev, self, id);
		return true;
	};

	/** @type {boolean} */
	this.moveEvents = false;

	/** @type {boolean} */
	this.scroll = false;

	if (application.exists) {
		var doc = this.contentDocument;
		if (doc && doc.readyState !== "complete" && application.src) this.openUrl(application.src);
	} else if (application.src) this.openUrl(application.src);

	if (this.windowTarget) this.windowTarget.dialog = this;

	if (application.classes && typeof application.classes === "object") {
		application.classes.forEach(function (clazz) { this.target && this.target.classList.add(clazz); }, this); // `class` is a reserved keyword.
	}
	if (application.title) this.setTitle(application.title);
	this.fixed = application.fixed || false;
	this.scroll = application.scroll || false;
	if (this.frame) {
		if (application.microphone || application.camera) this.frame.setAttribute("allow", "camera; microphone");
		this.frame.setAttribute("allow", "fullscreen");
	}

	this.moveEvents = application.moveEvents || false;

	this.setIcon(this.getMiniIconUrl(), function() {
		self.setIcon(self.getIconUrl());
	});

	this.setMinSize(180, 250, false);

	this.toggleButton(windowButtons.close, true);
	this.toggleButton(windowButtons.full, true);
	if (this.verifyEjectCapability()) this.toggleButton(windowButtons.eject, true);

	this.exchangeDialogMouseUpEvent = this.messageFrame.bind(this, "mouseUp", { difference: new Vector });

	/** @param {Coord} difference */
	this.exchangeDialogMoveEvent = function(difference) { this.messageFrame("windowMove", self.clickOffset.update(difference.x, difference.y)); };
	var target = this.target;

	var buttons = target.getElementsByTagName("button");


	if(this.resizable) this._createSizers();

	target.onselectstart = function (/** @type {Event} */event) {
		if (self._ctrlDrag) return;
		Helpers.cancelDomEvent(event);
	};

	var body = this.body;
	if (body) body.onload = function () {
		try { self.verifyEjectCapability(); }
		catch (exception) { console.warn(exception); if (buttons[0]) buttons[0].style.display = "none"; }
	};

	var header = this.titleBar;
	if (header) {
		header.onselectstart = function () { return false; };
		target.ondblclick = function (event) {
			var rect = Helpers.getRect(header);
			if (!rect || event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return;

			var node = event.target instanceof HTMLElement ? event.target : null;
			while (node && node !== header) {
				if (node.nodeName && node.nodeName.toLowerCase() === "button") return;
				node = node.parentElement;
			}
			self.toggleMaximized();
		};
	}

	if (capabilities.supportsPointer) target.onpointerdown = this.activationHandler;
	else target.onmousedown = this.activationHandler;

	var ejectButton = buttons[windowButtons.eject];
	if (ejectButton)
		ejectButton.onclick = this.eject.bind(this);

	var closeButton = buttons[windowButtons.close];
	if (closeButton)
		closeButton.onclick = this.close.bind(this);
	var fullscreenButton = buttons[windowButtons.full];
	if (fullscreenButton)
		fullscreenButton.onclick = function () { self.toggleMaximized(); };

	this.toggleOpen(false);

	target.ondragstart = function (event) {
		if (!(event.ctrlKey || self._ctrlDrag) || !event.dataTransfer || !self.application) {
			event.preventDefault();
			return;
		}

		/** @type {DialogDropState} */
		var dragState = {
			state: self.getState(),
			app: self.application
		};

		var rect = Helpers.getRect(self.target);
		if (rect) dragState.offset = {
			x: event.clientX - (rect.left + rect.width / 2),
			y: event.clientY - (rect.top + rect.height / 2)
		};

		var data = JSON.stringify(dragState);
		var transfer = event.dataTransfer;

		try {
			transfer.setData("application/json", data);
			if (flags.ieDropCompatibleMode) {
				transfer.setData("Text", data);
				transfer.setData("text/plain", data);
			}
			else transfer.setData("text/plain", self.src || self.title || self.id);
			if (self.src) transfer.setData("text/uri-list", self.src);
			transfer.setData("text/html", data);
			transfer.setData("URL", self.src + "\n" + data);
		} catch(ex) {
			console.warn(ex);
			transfer.setData("Text", data);
			if (self.src) transfer.setData("URL", self.src);
			transfer.setData("URL", "https://example.com");
		}

		transfer.effectAllowed = "copyMove";

		self.target.classList.add("hidden");

	};

	target.ondragend = function () {
		self._ctrlDrag = false;
	};

	if (this.id) windowManager.windows[this.id] = this;

	this.updateUseTransform(this.useTransform);
	this.updateScale(this.useScale);
	this.update();

	this.moveCenterTo(Helpers.getViewportWidth() / 2, Helpers.getViewportHeight() / 2);

	if (this.frame) this.frame.addEventListener("load", function() { self._loaded = true; }, false);

	this.originalBody = this.body;

	if (!this.scroll && this.originalBody) this.originalBody.style.overflow = "hidden";
};

/**
 * @param {string} name
 * @param {Element} [parent]
 */
Dialog.prototype.getElementByTagOrClassName = function (name, parent) {
	var target = parent || this.target;
	var elements = target.getElementsByTagName(name);
	if (!elements || !elements.length && target.getElementsByClassName) elements = target.getElementsByClassName(name);
	var element = (elements && elements.length) ? elements[0] : null;
	if (element && Helpers.isElement(element)) return element;
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
Dialog.prototype.moveToDesktop = function(i) {
	if (this.snapped && window.windowManager) windowManager.unsnapDialog(this);
	var desktop = window.desktopManager && window.desktopManager.desktops[i];
	if (desktop) desktop.insertWindow(this);
};

/** @param {HTMLElement} root */
Dialog.prototype.detachToRootKeepingVisual = function(root) {
	var target = this.target;
	var before = target.getBoundingClientRect();
	this.setParentElement(root);
	var after = target.getBoundingClientRect();
	if (!before.width || !after.width) return;
	var scale = before.width / after.width;
	var content = this.content;
	if (!content || !scale) return;

	content.style.transformOrigin = "0 0";
	content.style.scale = String(scale);
	var measured = content.getBoundingClientRect();
	Helpers.translateElement(content, (before.left - measured.left) / scale, (before.top - measured.top) / scale);

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

/** @param {number} i */
Dialog.prototype.dropIntoDesktop = function(i) {
	var visualLeft = null, visualTop = null, unscaledWidth = this._exposeVisualWidth;
	if (this.content) {
		var rendered = this.content.getBoundingClientRect();
		if (rendered.width) visualLeft = rendered.left, visualTop = rendered.top;
	}
	this.moveToDesktop(i);
	this.clearExposéVisual();
	if (visualLeft === null || visualTop === null || !this.target || !unscaledWidth) return;
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

	if (typeof createTouchSizers === "undefined") createTouchSizers = capabilities.supportsPointer;

	/**
	 * @this {Dialog}
	 * @param {number} id
	 */
	var createSizer = function (id) {
		var sizerId = "sizer-" + id;

		var sizer = self.getElementByTagOrClassName(sizerId);
		if (!sizer || !(Helpers.isElement(sizer))) sizer = document.createElement("div");
		sizer.draggable = false;
		sizer.setAttribute("unselectable", "on");
		sizer.id = id.toString();
		sizer.classList.add(sizerId);
		/** @param {PointerEvent | MouseEvent} ev */
		var pointerDown = function (ev) {
			if (!self.activationHandler || !self.activationHandler(ev, id)) return;
			windowManager.dragAction.set(id);
			if (windowManager.isTouchDrag) windowManager.windowSnap.moveToDialog(self, 20, id, false, true);
			Helpers.cancelDomEvent(ev);
		};
		var pointerUp = function () { windowManager.disableDialogDrag(); };
		if (capabilities.supportsPointer) {
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

			if (capabilities.supportsPointer) {
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
		if (kill && !opened) self.kill();
		if (opened) {
			self.reportState();
			windowManager.notifyExtensions("onWindowOpen", self);
		} else windowManager.notifyExtensions("onWindowClose", self);
	}, function (opening) {
		self._stateOpen = opening;
		if (opening) self.activate();
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
	if (frame || create === false) return frame;
	var body = this.body;
	if (!body) return null;
	try {
		var frameEl = document.createElement("iframe");
		body.appendChild(frameEl);
		return frameEl;
	} catch (ex) { console.warn(ex); }
	return null;
};
Object.defineProperty(Dialog.prototype, "isOpen", {
	get: function() { return Boolean(this.target && this.target.classList.contains("open")); },
	set: function(open) { this.toggleOpen(open); }
});
Object.defineProperty(Dialog.prototype, "frame", {
	get: function() { return this.target && this.target.getElementsByTagName("iframe")[0] || null; }
});
Object.defineProperty(Dialog.prototype, "resizable", {
	get: function() { return this.application.resizable !== false; },
	set: function(v) { if (v) this._createSizers(); }
});
Object.defineProperty(Dialog.prototype, "src", {
	get: function() { return this._src || this.application.src; },
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
	get: function () { return this._x * Helpers.getViewportWidth(); }, // TODO: derive from cached WindowManager.windowRect/work-area bounds
	set: function (x) { if (typeof x === "number") this.move(x, this.y); }
});

Object.defineProperty(Dialog.prototype, "y", {
	get: function () { return this._y * Helpers.getViewportHeight(); },
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
	set: function(position) { if (position instanceof Vector) this.move(position.x, position.y); }
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

/** The target width/height ratio that the window is constrained to when {@link Dialog#constrainAspectRatio} is enabled. 0 (or a non-positive value) means no constraint. */
Object.defineProperty(Dialog.prototype, "aspectRatioConstraint", {
	get: function() { return this._aspectRatio; },
	set: function(aspect) { this._aspectRatio = typeof aspect === "number" && aspect > 0 ? aspect : 0; }
});

/** Whether the window's {@link Dialog#aspectRatioConstraint} should be enforced by {@link Dialog#resize}. When enabled, resizing always keeps the window at the constraint ratio. */
Object.defineProperty(Dialog.prototype, "constrainAspectRatio", {
	get: function() { return this._aspectRatioEnabled; },
	set: function(enabled) {
		if (!this._aspectRatio) this._aspectRatio = this.aspectRatio;
		this._aspectRatioEnabled = !!enabled;
	}
});

/** Selects how corner resizes behave when {@link Dialog#constrainAspectRatio} is enabled. The axis that is locked switches automatically based on which side of the corner's diagonal (the aspect ratio line) the mouse is on, so the resize stays a proper right angle instead of a single axis. - `true` (inner / L shape): locks the SMALLER axis, so the window hugs the corner under the mouse. - `false` (outer / V shape, default): locks the LARGER axis, so the mouse goes away from the window. */
Object.defineProperty(Dialog.prototype, "constrainAspectRatioInner", {
	get: function() { return this._constrainAspectRatioInner; },
	set: function(enabled) { this._constrainAspectRatioInner = !!enabled; }
});

/** Forces corner resizes (when {@link Dialog#constrainAspectRatio} is enabled) to keep the dragged corner on a straight line, instead of snapping between the L (inner) and V (outer) axis paths. The dragged corner is pinned to the window's own diagonal and the size follows the cursor's projection onto that diagonal, so it scales along a straight path in between the other modes. */
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
		var bounds = WindowManager.windowRect;
		var bottom = this.bottomFromTop;
		if (bounds.bottom !== Infinity && bottom >= bounds.bottom - 0.5) bottom = bounds.bottom;
		if (top < bounds.top) top = bounds.top;
		var height = Math.max(Math.min(bottom - top, this.maxHeight), this.minHeight);
		top = bottom - height;
		this._height = height;
		this._y = top / Helpers.getViewportHeight();
		if (this.useTransform) {
			this.target.style.height = Helpers.toPixels(height);
			this.updateTransform();
		} else this.setInset(top, this.left, this.right, Helpers.getViewportHeight() - bottom);
		this._isMinHeight = height === this.minHeight;
	}
});

Object.defineProperty(Dialog.prototype, "left", {
	get: function() { return this.x; },
	set: function(left) {
		var bounds = WindowManager.windowRect;
		var right = this.rightFromLeft;
		if (bounds.right !== Infinity && right >= bounds.right - 0.5) right = bounds.right;
		if (left < bounds.left) left = bounds.left;
		var width = Math.max(Math.min(right - left, this.maxWidth), this.minWidth);
		left = right - width;
		this._width = width;
		this._x = left / Helpers.getViewportWidth();
		if (this.useTransform) {
			this.target.style.width = Helpers.toPixels(width);
			this.updateTransform();
		} else this.setInset(this.top, left, Helpers.getViewportWidth() - right, this.bottom);
		this._isMinWidth = width === this.minWidth;
	}
});

Object.defineProperty(Dialog.prototype, "rightFromLeft", {
	get: function() { return this.x + this.width; },
	set: function(right) { this.width = right - this.x; }
});

Object.defineProperty(Dialog.prototype, "right", {
	get: function() { var rfl = this.rightFromLeft; return typeof rfl === "number" && rfl === rfl ? Helpers.getViewportWidth() - rfl : 0; },
	set: function(right) {
		if (typeof right === "number") {
			var bounds = WindowManager.windowRect;
			if (right > bounds.right) right = bounds.right;
			if (right < bounds.left) right = bounds.left;
			this.width = (Helpers.getViewportWidth() - right) - this.x;
		}
	}
});

Object.defineProperty(Dialog.prototype, "bottomFromTop", {
	get: function() { return this.y + this.height; },
	set: function(bottom) { this.height = bottom - this.y; }
});

Object.defineProperty(Dialog.prototype, "bottom", {
	get: function() { var bft = this.bottomFromTop; return typeof bft === "number" && bft === bft ? Helpers.getViewportHeight() - bft : 0; },
	set: function(bottom) {
		if (typeof bottom === "number") {
			var bounds = WindowManager.windowRect;
			if (bottom > bounds.bottom) bottom = bounds.bottom;
			if (bottom < bounds.top) bottom = bounds.top;
			this.height = (Helpers.getViewportHeight() - bottom) - this.y;
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
		if (this.application.title) return this.application.title;
		var titleElement = this.getTitleElement();
		if (titleElement && titleElement.innerHTML) return titleElement.innerHTML;
		return this.id;
	},
	set: function(title) { this.setTitle(title); }
});

Object.defineProperty(Dialog.prototype, "maximized", {
	get: function() { return this.target.classList.contains("maximized"); },
	set: function(maximized) { this.toggleMaximized(maximized); }
});

Object.defineProperty(Dialog.prototype, "snapped", {
	get: function() { return this.target.classList.contains("snapped"); },
	set: function(snapped) { this.toggleSnapped(snapped); }
});

Object.defineProperty(Dialog.prototype, "heightSnapped", {
	get: function() { return this.target.classList.contains("height-snapped"); },
	set: function(snapped) { this.toggleHeightSnapped(snapped); }
});

Object.defineProperty(Dialog.prototype, "windowTarget", {
	get: function() {
		var target = this.target;
		return target && "dialog" in target ? /** @type {WindowElement} */ (target) : null;
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
	get: function() { return this.getElementByTagOrClassName("content"); }
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
	get: function() { return true; }
});

Object.defineProperty(Dialog.prototype, "borderSize", {
	set: function (value) {
		if (!this.content) return;
		this.content.style.padding = Helpers.toPixels(value);
		this.content.style.border = Helpers.toPixels(value);
		this.content.style.borderRadius = Helpers.toPixels(value);
	},
	get: function () { return this.content && Helpers.fromPixels(this.content.style.padding); }
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
	get: function() { return this.getIconUrl(); }
});

Dialog.prototype.getIconUrl = function() {
	return this.application.iconUrl || (this.application.src && Helpers.getFaviconUrl(this.application.src)) || null;
};

Dialog.prototype.getMiniIconUrl = function() {
	return this.application.src ? Helpers.getFaviconUrl(this.application.src) : null;
};

/**
 * @param {string | null} iconUrl
 * @param {()=>void} [onError]
 */
Dialog.prototype.setIcon = function(iconUrl, onError) {
	if (!iconUrl) return onError && onError();
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
	var content = this.content;
	if (!content || this.maximized || this._maximizing) return;
	content.style.transformOrigin = "center";
	if (this.contentTransform) this.contentTransform.scale(scaleX, scaleY, update !== false, !noAnimation);
};
/**
 * @param {number} [scaleX]
 * @param {number} [scaleY]
 */
Dialog.prototype.setDragScale = function(scaleX, scaleY) {
	var nextX = scaleX || 1;
	var nextY = scaleY || 1;

	if (nextX === this._scaleX && nextY === this._scaleY) return;
	this._scaleX = nextX;
	this._scaleY = nextY;

	var content = this.content;
	if (!content || this.maximized || this._maximizing) return;
	content.style.transformOrigin = "center";
	content.style.scale = nextX === 1 && nextY === 1 ? "" : nextX + " " + nextY;
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
};
Dialog.prototype.getTitleElement = function() { return this.getElementByTagOrClassName("h1"); };
Dialog.prototype.open = function () { return this.toggleOpen(true); };
Dialog.prototype.close = function () { return this.toggleOpen(false); };

/**
 * @param {boolean} [ofBody]
 * @param {number} [index]
 */
Dialog.prototype.getRect = function (ofBody, index) { return Helpers.getRect(ofBody ? this.body : this.target, index); };
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
		openButton.onclick = function () {
			var instance = windowManager.spawnApp(application);
			if (instance) instance.launch();
		};
	} else openButton.onclick = this.launch.bind(this);
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
 * @param {number} frameX Left edge of the drawn frame.
 * @param {number} frameY Top edge of the drawn frame.
 * @param {number} frameWidth Width of the drawn frame.
 * @param {number} frameHeight Height of the drawn frame.
 */
Dialog.prototype.remapClickOffset = function (frameX, frameY, frameWidth, frameHeight) {
	var offset = this.clickOffset;
	if (!offset || frameWidth <= 0 || frameHeight <= 0) return;

	offset.clickPosition.x = this.x + (offset.clickPosition.x - frameX) * (this.width / frameWidth);
	offset.clickPosition.y = this.y + (offset.clickPosition.y - frameY) * (this.height / frameHeight);
};
Dialog.prototype.verifyEjectCapability = function() { return Boolean(this.application.src); };
Object.defineProperty(Dialog.prototype, "href", { get: function () {
	return this.application.src || null;
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
	if (this._snappingOut) {
		if (this.target && this.target._animationState !== this._snappingOutState) {
			this._snappingOut = false;
			this._snappingOutState = null;
		}
		return;
	}
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
	Helpers.animateElement(this.target, onToggled, onTransitionEnd, onEnd, this, timeout, flip);
};
/**
 * @param {string} className
 * @param {boolean} [force]
 * @param {TransitionEndCallback} [onTransitionEnd]
 * @param {(this:Dialog,enabled:boolean)=>void} [onEnd]
 * @param {(this:Dialog,enabled:boolean)=>void} [onToggled]
 * @param {number} [timeout] Safety net: a property whose transition keeps being restarted never fires transitionend, so without this the animation can hang with `animating` still on the element.
 */
Dialog.prototype.toggleClassAnimated = function (className, force, onTransitionEnd, onEnd, onToggled, timeout) {
	var self = this;
	var enabled = false;
	this.animate(function() {
		enabled = Helpers.setClass(self.target, className, force);
		if (onToggled) onToggled.call(self, enabled);
	}, onTransitionEnd, function() { if (onEnd) onEnd.call(self, enabled); }, timeout);
};

Dialog.prototype._endSnapTransition = function () {
	this._snappingOut = false;
	this._snappingOutState = null;
};

/**
 * @param {string} className
 * @param {boolean} [enable]
 * @param {boolean} [useFlip]
 * @param {TransitionEndCallback} [onTransitionEnd]
 * @param {(this:Dialog)=>void} [onEnable]
 */
Dialog.prototype._toggleSnap = function (className, enable, useFlip, onTransitionEnd, onEnable) {
	var target = this.target;
	if (enable === null) enable = !target.classList.contains(className);
	if (target.classList.contains(className) === enable) return;
	if (enable && onEnable) onEnable.call(this);

	this._snappingOut = !enable;
	this._snappingOutState = null;

	var self = this;
	var onEnd = function () { self._endSnapTransition(); };
	if (useFlip) this.animate(function () { Helpers.setClass(self.target, className, enable); }, onTransitionEnd, onEnd, 1000, true);
	else this.toggleClassAnimated(className, enable, onTransitionEnd, onEnd, undefined, 1000);

	this._snappingOutState = /** @type {any} */ (target)._animationState;
};

/** @param {boolean} [enable] */
Dialog.prototype.toggleSnapped = function (enable) {
	this._toggleSnap("snapped", enable, true, function (name) {
		return name === "translate" || name === "scale";
	});
};

/** @param {boolean} [enable] */
Dialog.prototype.toggleHeightSnapped = function (enable) {
	this._toggleSnap("height-snapped", enable, false, function (name) {
		return name === "height" || name === "transform";
	}, function () { this.move(this.x, 0); });
};

/** @param {boolean} [enable] */
Dialog.prototype.toggleMaximized = function (enable) {

	if (typeof enable !== "boolean") enable = !this.maximized;
	if (this.maximized === enable) return;
	if (enable && this.snapped && windowManager) windowManager.unsnapDialog(this);
	if (enable && this.heightSnapped) this.toggleHeightSnapped(false);

	var self = this;
	var target = this.target;
	var content = this.content;

	var fsTimeout = 0;

	this.setZ();

	this.broadcastState({ maximized: enable === true });

	this.maximizeAnimations++;

	if (flags.useViewTransitionMaximize && this.windowTarget)
		return this.windowTarget.toggleMaximizedVT(enable);

	if (capabilities.supportsTransitions) {
		if (!flags.compositorResize) this.toggleClassAnimated("maximized", enable, function(name) {
			return name === "transform" || name === "width";
		}, undefined, function(isMaximized) {
			if (this.useTransform && this.target) this.toggleMinSizeConstraints(isMaximized);
			this.maximizeAnimations--;
		}); else this.toggleClassAnimated("scaled-max", enable, "transform", function(enabled) {
			if (fsTimeout) clearTimeout(fsTimeout);
			target.classList.toggle("maximized", enabled);
			target.style.pointerEvents = "";
			if (this.transform) this.transform.scale(1, 1, undefined, true);
			this.updateTransform();
			if (!content) { this.maximizeAnimations--; return; }
			Helpers.transformElement(content, {x: 0, y: 0, scaleX: 1, scaleY: 1});
			content.style.width = "";
			content.style.height = "";
			if (!enabled) content.style.transformOrigin = "center";
			this.maximizeAnimations--;
		}, function(enabled) {
			this._maximizing = enabled;
			var startWidth = this.width, startHeight = this.height;
			var windowSection = document.getElementById("window-section");
			var height = windowSection ? windowSection.clientHeight : window.innerHeight;
			var scaleX = window.innerWidth / startWidth, scaleY = height / startHeight;
			target.style.transformOrigin = "top left";
			target.style.pointerEvents = "none";
			if (content) {
				content.style.scale = "";
				content.style.transformOrigin = "";
				content.style.transition = "";
			}
			if (!enabled) { scaleX = 1 / scaleX; scaleY = 1 / scaleY; }
			if (this.transform) this.transform.scale(scaleX, scaleY, false);
			this.updateTransform();
			var targetWidth = enabled ? window.innerWidth : self.width;
			var targetHeight = enabled ? height : self.height;
			fsTimeout = setTimeout(function() {
				requestAnimationFrame(function() {
					if (!content) return;
					content.style.width = Helpers.toPixels(targetWidth);
					content.style.height = Helpers.toPixels(targetHeight);
					void content.offsetWidth;
					Helpers.transformElement(content, {x: 0, y: 0, scaleX: 1 / scaleX, scaleY: 1 / scaleY});
				});
			}, 50);
		});
	} else {
		var startPos = self.position, startSize = self.size;
		enable = !target.classList.contains("maximized");
		var toggleMaximized = function() {
			self.x = startPos.x; self.y = startPos.y;
			self.width = startSize.x; self.height = startSize.y;
			self.target.classList.toggle("maximized", enable);
		};
		if (!enable) toggleMaximized();
		Anim.animate(300, function(t) {
			var ease = Anim.easeSharpCenterStrong(t);
			if (enable) {
				self.x = Anim.lerp(startPos.x, 0, ease); self.y = Anim.lerp(startPos.y, 0, ease);
				self.width = Anim.lerp(startSize.x, window.innerWidth, ease); self.height = Anim.lerp(startSize.y, window.innerHeight, ease);
			} else {
				self.x = Anim.lerp(0, startPos.x, ease); self.y = Anim.lerp(0, startPos.y, ease);
				self.width = Anim.lerp(window.innerWidth, startSize.x, ease); self.height = Anim.lerp(window.innerHeight, startSize.y, ease);
			}
		}, function() { if (enable) toggleMaximized(); });
	}
};

Dialog.prototype.unmaximizeForDrag = function() {
	var target = this.target;
	var content = this.content;
	if (!target || !this.maximized) return;
	if (document.activeViewTransition && document.activeViewTransition.skipTransition)
		document.activeViewTransition.skipTransition();
	Helpers.cancelAnimation(target);
	target.classList.remove("animating", "scaled-max", "maximized");
	target.style.pointerEvents = "";
	target.style.transformOrigin = "";
	target.style.viewTransitionName = "";
	if (this.transform) this.transform.scale(1, 1, false, false);
	if (content) {
		Helpers.transformElement(content, { x: 0, y: 0, scaleX: 1, scaleY: 1 });
		content.style.width = "";
		content.style.height = "";
		content.style.transformOrigin = "center";
	}
	if (this.useTransform) this.toggleMinSizeConstraints(false);
	this._maximizing = false;
	this.maximizeAnimations = 0;
	this.broadcastState({ maximized: false });
};

/** @param {boolean} [enable] */
Dialog.prototype.maximize = function () { this.toggleMaximized(true); };
/**
 * @param {MessageType} type
 * @param {unknown} [message]
 */
Dialog.prototype.messageFrame = function (type, message) {
	var frame = this.frame;
	if (frame) LVMessenger.broadcastToChild(type, frame, message);
};

/** @param {boolean} [animate] */
Dialog.prototype.updateTransform = function (animate) {
	if (this.useTransform && this.transform)
		if (this._maximizing) this.transform.move(0, 0, animate);
		else this.transform.move(this.x, this.y, animate);
};

Dialog.prototype.updatePosition = function() {
	if (this.useTransform) this.updateTransform();
	else this.setInset(this.top, this.left, this.right, this.bottom);

	windowManager.notifyExtensions("onWindowMove", this);
};

/** @param {Partial<DialogState>} [overrides] The state fields that actually changed. */
Dialog.prototype.broadcastState = function (overrides) {
	if (!windowManager || !flags.broadcastWindowMoves || !document.hasFocus()) return;
	if (this.id) windowManager.broadcast("dialog-state", overrides || this.getState(), this.id);
};

/**
 * @param {number} [x]
 * @param {number} [y]
 * @param {boolean} [update]
 * @param {boolean} [animate]
 */
Dialog.prototype.move = function (x, y, update, animate) {
	if (this.fixed) return;
	var prevX = this.x, prevY = this.y;
	if (typeof x === "undefined" || x === null) x = this.x;
	if (typeof y === "undefined" || y === null) y = this.y;
	if (this.heightSnapped) y = this.y;
	if (typeof this._exposeVisualScale !== "number") {
		var bounds = WindowManager.windowRect;
		if (x < bounds.left) x = bounds.left;
		if (bounds.right !== Infinity && x > bounds.right - this.width) x = bounds.right - this.width;
		if (y < bounds.top) y = bounds.top;
		if (bounds.bottom !== Infinity && y > bounds.bottom - this.height) y = bounds.bottom - this.height;
	}
	var windowWidth = Helpers.getViewportWidth();
	var windowHeight = Helpers.getViewportHeight();
	var previousX = this._x, previousY = this._y;
	this._x = x / windowWidth;
	this._y = y / windowHeight;
	if (this.velocityTracking) {
		this.velocityX = this.x - prevX;
		this.velocityY = this.y - prevY;
	}

	if (update !== false)
		if (animate) this.animate(this.updatePosition);
		else this.updatePosition();

	if (previousX === this._x && previousY === this._y) return;
	var state = {};
	if (previousX !== this._x) state.x = this.x;
	if (previousY !== this._y) state.y = this.y;
	this.broadcastState(state);
};
/**
 * @param {number} centerX
 * @param {number} centerY
 * @param {boolean} [animate]
 */
Dialog.prototype.moveCenterTo = function(centerX, centerY, animate) {
	this.move(centerX - this.width / 2, centerY - this.height / 2, true, animate);
};

/** @param {number} [z] */
Dialog.prototype.setZ = function(z) {
	if (this.fixed) return;
	var prev = this._z;
	if (typeof z === "undefined") { if (this._z !== windowManager.topZ) this._z = ++windowManager.topZ; }
	else this._z = z;
	if (Helpers.isElement(this.target)) this.target.style.zIndex = String(this._z);
	if (prev !== this._z) this.broadcastState({ z: this._z });
};
Dialog.prototype.updateWidth = function () { this.useTransform || this.useScale ? this.target.style.width = Helpers.toPixels(this._width) : this.target.style.right = Helpers.toPixels(this.right); };
Dialog.prototype.updateHeight = function () { this.useTransform || this.useScale ? this.target.style.height = Helpers.toPixels(this._height) : this.target.style.bottom = Helpers.toPixels(this.bottom); };
/** @param {"width"|"height"} axis @param {number} size @param {boolean} [update] @param {boolean} [animate] */
Dialog.prototype._setSize = function (axis, size, update, animate) {
	if (typeof size !== "number" || axis === "height" && !this.target) return;
	var isW = axis === "width", b = WindowManager.windowRect, far = isW ? b.right : b.bottom, near = isW ? b.left : b.top, pos = isW ? this.x : this.y;
	if (far !== Infinity) {
		var overflow = pos + size - far;
		if (overflow > 0) { var np = pos - overflow; if (near !== undefined && np < near) np = near; isW ? this.move(np) : this.move(this.x, np); }
		size = Math.min(size, far - (isW ? this.x : this.y));
	}
	if (isW) { this._width = Math.max(Math.min(size, this.maxWidth), this.minWidth); this._isMinWidth = this._width === this.minWidth; }
	else { this._height = Math.max(Math.min(size, this.maxHeight), this.minHeight); this._isMinHeight = this._height === this.minHeight; }
	if (update !== false) animate ? this.animate(isW ? this.updateWidth : this.updateHeight) : (isW ? this.updateWidth() : this.updateHeight());
};
/** @param {number} width @param {boolean} [update] @param {boolean} [animate] */
Dialog.prototype.setWidth = function (width, update, animate) { this._setSize("width", width, update, animate); };
/** @param {number} height @param {boolean} [update] @param {boolean} [animate] */
Dialog.prototype.setHeight = function (height, update, animate) { this._setSize("height", height, update, animate); };

/**
 * @param {number} [width]
 * @param {number} [height]
 * @param {ResizeDirection} [direction] Which handle is being resized. When given, the edges opposite the handle stay put (so resizing up/left/top-left also moves the window).
 */
Dialog.prototype.resize = function (width, height, direction) {
	if (this.fixed) return;
	if (typeof width === "undefined" || width === null) width = this.width;
	if (typeof height === "undefined" || height === null) height = this.height;
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
 * @param {number} width
 * @param {number} height
 * @param {ResizeDirection} [direction]
 */
Dialog.prototype._resizeFree = function (width, height, direction) {
	var oldX = this.x, oldY = this.y;
	var oldW = this.width, oldH = this.height;
	var bounds = WindowManager.windowRect;
	var maxW = this._maxWidth, maxH = this._maxHeight;
	var minW = this._minWidth, minH = this._minHeight;

	width = Math.max(Math.min(width, maxW), minW);
	height = Math.max(Math.min(height, maxH), minH);

	var newW = width, newH = height;

	if (direction === "left" || direction === "bottom-left" || direction === "top-left")
		newW = Math.min(newW, oldX + oldW - bounds.left);
	else if (direction !== "top" && direction !== "bottom")
		newW = Math.min(newW, bounds.right - oldX);

	if (direction === "top" || direction === "top-left" || direction === "top-right")
		newH = Math.min(newH, oldY + oldH - bounds.top);
	else if (direction !== "left" && direction !== "right")
		newH = Math.min(newH, bounds.bottom - oldY);

	if (newW === oldW && newH === oldH) return;

	var newX = oldX, newY = oldY;

	switch (direction) {
		case "bottom-left":
		case "left": newX = oldX + oldW - newW; break;
		case "top-left": newX = oldX + oldW - newW;
		case "top-right":
		case "top": newY = oldY + oldH - newH; break;
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
 * @param {number} width
 * @param {number} height
 * @param {ResizeDirection} [direction]
 */
Dialog.prototype._resizeWithAspect = function (width, height, direction) {
	var ratio = this._aspectRatio;
	var oldX = this.x, oldY = this.y;
	var oldW = this.width, oldH = this.height;
	var oldRight = oldX + oldW, oldBottom = oldY + oldH;
	var bounds = WindowManager.windowRect;
	var maxW = this._maxWidth, maxH = this._maxHeight;
	var minW = this._minWidth, minH = this._minHeight;

	var isCorner = direction === "top-left" || direction === "top-right" || direction === "bottom-left" || direction === "bottom-right";

	var newW, newH;
	if (isCorner && this._constrainAspectRatioLine) {
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
		var scale = ((cX - fX) * diagX + (cY - fY) * diagY) / (diagX * diagX + diagY * diagY);
		if (scale < 0) scale = 0;
		newW = scale;
		newH = scale / ratio;
	} else {
		if (width < 0) width = 0;
		if (height < 0) height = 0;

		var driveByWidth;
		if (direction === "top" || direction === "bottom")
			driveByWidth = false;
		else if (isCorner) {
			var boxRatio = height ? width / height : (width > 0 ? Infinity : 1);
			driveByWidth = this._constrainAspectRatioInner ? boxRatio <= ratio : boxRatio > ratio;
		} else driveByWidth = true;

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

	var fromLeft = direction === "left" || direction === "bottom-left" || direction === "top-left";
	newW = Math.min(newW, fromLeft ? oldRight - bounds.left : bounds.right - oldX);
	newH = newW / ratio;
	var fromTop = direction === "top" || direction === "top-left" || direction === "top-right";
	newH = Math.min(newH, fromTop ? oldBottom - bounds.top : bounds.bottom - oldY);
	newW = newH * ratio;

	var minScale = Math.max(minW, minH * ratio);
	var maxScale = Math.min(maxW, maxH * ratio);
	if (newW < minScale) newW = minScale;
	if (newW > maxScale) newW = maxScale;
	newH = newW / ratio;

	if (newW === oldW && newH === oldH) return;

	var newX = oldX, newY = oldY;
	switch (direction) {
		case "bottom-left": newX = oldRight - newW;  break;
		case "top-left":    newX = oldRight - newW;
		case "top-right":   newY = oldBottom - newH; break;
		case "left":        newX = oldRight - newW;
		case "right":       newY = oldY + oldH / 2 - newH / 2; break;
		case "top":         newY = oldBottom - newH;
		case "bottom":      newX = oldX + oldW / 2 - newW / 2; break;
	}

	this._width = newW;
	this._height = newH;
	this._isMinWidth = newW === minW;
	this._isMinHeight = newH === minH;

	if (newX !== oldX || newY !== oldY) this.move(newX, newY);
	this.updateWidth();
	this.updateHeight();
};
Dialog.prototype.update = function () { this.move(); this.resize(); };
/**
 * @param {number} [width]
 * @param {number} [height]
 * @param {boolean} [update]
 */
Dialog.prototype.setMinSize = function (width, height, update) {
	this._minWidth = typeof width === "number" ? width : 180;
	this._minHeight = typeof height === "number" ? height : 200;
	if (update !== false) this.resize();
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
	var bodyRect = this.getRect(true);
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
	if (this.useScale) Helpers.insetElement(this.target, top, left);
	else Helpers.insetElement(this.target, top, left, right, bottom);
};

/** @param {string} [url] */
Dialog.prototype.openUrl = function(url) {
	var self = this;
	var frame = this.getOrCreateFrame(true);
	if (!frame)
		return setTimeout(function() { self.openUrl(url); }, 5);

	var timeout = -1;
	var refreshLayout = function() {
		try { self.updateBodyOffset(); self.resize(self.width, self.height); self.update(); } catch (ex) { console.warn(ex); }
	};

	frame.onload = function() {
		clearTimeout(timeout);
		self.reportState();
		refreshLayout();
		setTimeout(refreshLayout, 50);
	};

	var baseUrls = [url || this.src, this.application.distSrc];
	if (!isLocal) baseUrls.reverse();
	var urls = baseUrls.concat(this.application.altUrls || []);
	function tryNext() {
		var nextUrl;
		while (urls.length && !(nextUrl = urls.shift()));
		if (!nextUrl || !frame) return;
		frame.src = nextUrl;
		self._src = nextUrl;
		clearTimeout(timeout);
		timeout = setTimeout(tryNext, 3000);
	}

	frame.addEventListener("error", tryNext, false);

	tryNext();
};

Dialog.prototype.refresh = function() { if (this.frame) this.openUrl(this.frame.src); };

Dialog.prototype.launch = function() {
	if (!this.isOpen) this.insertIntoDOM();
	this.target.classList.remove("hidden");
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
	var body = this.body, titleBar = this.titleBar;
	if (!body || !this.href) return;
	var rect = body.getBoundingClientRect();
	var v = Helpers.getViewBoxPosition(), th = titleBar && titleBar.getBoundingClientRect().height || 0;
	this._popupWindow = window.open(this.href, this.title || "LVOS", Helpers.stringifyWindowOpenProperties({
		scrollbars: true, resizable: true, status: false, location: false, toolbar: false, menubar: false,
		width: rect.width, height: rect.height, left: rect.left + v.x, top: rect.top + v.y + th
	}));
	if (!this._popupWindow) return;
	var self = this, prev = { x: -1, y: -1, w: -1, h: -1 };
	var wChrome = Helpers.getWindowChromeHeight(window), pChrome = Helpers.getWindowChromeHeight(this._popupWindow);
	this._popupPositionInterval = setInterval(function() {
		var p = self._popupWindow;
		if (!p || p.closed) { clearInterval(self._popupPositionInterval); self._popupPositionInterval = 0; self.launch(); return; }
		var ox = Math.round(p.screenX), oy = Math.round(p.screenY), w = Math.round(p.outerWidth), h = Math.round(p.innerHeight || p.outerHeight);
		if (ox !== prev.x || oy !== prev.y) { self.moveBody(ox - window.screenX, oy - window.screenY - wChrome + pChrome); prev.x = ox; prev.y = oy; }
		if (w !== prev.w || h !== prev.h) { self.resizeBody(w, h); prev.w = w; prev.h = h; }
	}, 100);
};


/** @param {boolean} useTransform */
Dialog.prototype.updateUseTransform = function(useTransform) {
	this._useTransform = useTransform;
	var target = this.target;
	if (useTransform) target.style.top = "", target.style.left = "";
	else {
		target.style.transform = "", target.style.webkitTransform = "";
		target.style.width = "", target.style.height = "";
	}

	this.updateScale(this.useScale);
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
		var right = this.right, bottom = this.bottom;
		if (right === right) target.style.right = Helpers.toPixels(right);
		if (bottom === bottom) target.style.bottom = Helpers.toPixels(bottom);
	}
	target.classList.toggle("use-scale", useScale);

	this.update();
};

/** @param {boolean} [isMaximized] */
Dialog.prototype.toggleMinSizeConstraints = function(isMaximized) {
    this.target.style.minWidth = isMaximized ? "100%" : Helpers.toPixels(this.minWidth);
    this.target.style.minHeight = isMaximized ? "100%" : Helpers.toPixels(this.minHeight);
};



/** @returns {DialogState} */
Dialog.prototype.getState = function() {
	return {
		title: this.title || this.id || "Unc",
		x: this.x, y: this.y, z: this.z,
		width: this.width || this.minWidth,
		height: this.height || this.minHeight,
		open: this._stateOpen || this.isOpen || false,
		maximized: this.maximized
	};
};

/** @param {Partial<DialogState>} state */
Dialog.prototype.loadState = function(state) {
	if ("open" in state) {
		if (state.open) this.launch();
		else this.toggleOpen(false);
	}
	if ("title" in state) this.title = state.title;
	if ("x" in state || "y" in state)
		this.move("x" in state ? state.x : this.x, "y" in state ? state.y : this.y, true, false);
	if ("z" in state && typeof state.z === "number") this.setZ(state.z);
	if ("width" in state || "height" in state)
		this.resize("width" in state ? state.width : this.width, "height" in state ? state.height : this.height);
	if ("maximized" in state) this.toggleMaximized(state.maximized === true);
};

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

window.addEventListener("resize", WindowManager.updateWindowRect, false);
window.addEventListener("load", WindowManager.updateWindowRect, false);

window.addEventListener("unload", function() { windowManager && windowManager.saveState(); }, false);
window.addEventListener("dragover", Helpers.cancelDomEvent, false);
window.addEventListener("drop", function(e) { e.preventDefault(); }, false);

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
