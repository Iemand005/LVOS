
//#region Foundational Helpers

var isBlink = "chrome" in window;
var isIE = typeof window !== "undefined" && typeof document !== "undefined" && !!window.MSInputMethodContext && document.documentMode === 11;
/** @type {"webkitTransitionEnd" | "transitionend"} */
var transitionEndEvent = ("transition" in document.documentElement.style) ? "transitionend" : ("webkitTransition" in document.documentElement.style) ? "webkitTransitionEnd" : "transitionend";
var capabilities = {
	supportsTransitions: true,
	supportsTransform: true,
	supportsPointer: typeof window !== "undefined" && "PointerEvent" in window  && !("MSPointerEvent" in window)
};
(function () {
	var style = document.createElement("div").style;
	capabilities.supportsTransitions = ("transition" in style ||"WebkitTransition" in style ||"MozTransition" in style ||"OTransition" in style ||"msTransition" in style);
	capabilities.supportsTransform = ( "transform" in style || "webkitTransform" in style || "msTransform" in style || "mozTransform" in style || "OTransform" in style);
})();
/** @class */
function Helpers() {}
/** @param {Event} event */
Helpers.cancelDomEvent = function(event) {
	try {
		if (typeof event.preventDefault === "function") event.preventDefault();
		if (typeof event.stopPropagation === "function") event.stopPropagation();
		event.returnValue = false;
		event.cancelBubble = true;
		return false;
	} catch(ex) { console.warn("Failed co tancel dom evemnt.txt", ex); }
	return false;
};

/** @param {string} url */
Helpers.getFaviconUrl = function(url) { return "https://" + Helpers.getDomain(url) + "/favicon.ico"; };
/** @param {string} url */
Helpers.getDomain = function(url) {
	var regged = url.replace(/^[a-z]+:\/\/+/i, "").split("/")[0];
	return regged && regged.split("?")[0];
};
/** @param {string} url */
Helpers.getSiteName = function(url) {
	var domain = Helpers.getDomain(url), parts = domain && domain.split(".");
	var name = parts && (parts.length >= 2 ? parts[parts.length - 2] : parts[0]);
	return name ? name.charAt(0).toUpperCase() + name.slice(1) : null;
};
/**
 * @param {any} [object]
 * @returns {object is HTMLElement}
 */
Helpers.isElement = function(object) { return object && ("nodeType" in object) || false; };
/** @param {Window} window */
Helpers.getWindowChromeHeight = function(window) {
	return window.outerHeight - Helpers.getViewportHeight();
};
Helpers.translateElement = function(element, x, y) { Helpers.transformElement(element, { x: x, y: y }); };
Helpers.transformElement = function(element, t) {
	var transform = "";
	if (t.x && t.y) transform += "translate(" + Helpers.toPixels(t.x) + "," + Helpers.toPixels(t.y) + ")";
	else if (t.x) transform += "translateX(" + Helpers.toPixels(t.x) + ")";
	else if (t.y) transform += "translateY(" + Helpers.toPixels(t.y) + ")";
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
};
/**
 * @param {HTMLElement} element
 * @param {number} top
 * @param {number} [left]
 * @param {number} [right]
 * @param {number} [bottom]
 */
Helpers.insetElement = function(element, top, left, right, bottom) {
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
};

/**
 * @param {HTMLElement} element
 * @param {string} className
 * @param {boolean} [enabled]
 */
Helpers.setClass = function(element, className, enabled) {
	var re = new RegExp("(^|\\s)" + className + "(\\s|$)");
	if (typeof enabled === "undefined") enabled = element.className.indexOf(className) === -1;
	if (enabled && !re.test(element.className)) element.className = (element.className + " " + className).replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
	if (!enabled) element.className = element.className.replace(re, " ").replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
	return element.className.indexOf(className) !== -1;
};
/**
 * @param {HTMLElement| null} element
 * @param {number} [index]
 */
Helpers.getRect = function(element, index) {
	if (!element) return;
	return index ? element.getClientRects()[index] : element.getBoundingClientRect();
};

Helpers.getOverlay = function() { return document.getElementById("overlay"); };

/** @param {WindowOpenProperties} properties */
Helpers.stringifyWindowOpenProperties = function(properties){
	return JSON.stringify(properties).replace(/true/g, "yes").replace(/false/g, "no").replace(/:/g, "=").replace(/[}{"]/g, "");
};

Helpers.getViewBoxPosition = function() {
	return { x: window.screenLeft, y: window.screenTop };
};

Helpers.getViewportHeight = function() {
	var rect = WindowManager._windowRect;
	if (rect && rect.height) return rect.height;
	return window.innerHeight || (document.documentElement && document.documentElement.clientHeight) || (document.body && document.body.clientHeight) || 0;
};

Helpers.getViewportWidth = function() {
	var rect = WindowManager._windowRect;
	if (rect && rect.width) return rect.width;
	return window.innerWidth || (document.documentElement && document.documentElement.clientWidth) || (document.body && document.body.clientWidth) || 0;
};

Helpers.toPixels = function(/** @type {number} */value) { return Math.round(value || 0) + "px"; };
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

/**
 * @param {HTMLElement} element
 * @param {(this: any) => void} [onToggled] Applies the change. Runs synchronously.
 * @param {any} [thisArg]
 */
Helpers.flipElement = function(element, onToggled, thisArg) {
	var first = element.getBoundingClientRect();

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

	void element.offsetWidth;

	element.style.transition = previousTransition;
	element.classList.add("animating", "flipping");

	element._flipFrame = window.requestAnimationFrame(function() {
		element._flipFrame = 0;
		element.style.translate = "0px 0px";
		element.style.scale = "1";
	});
};

/**
 * Undoes everything {@link flipElement} wrote, so the element is back to its own state.
 * @param {HTMLElement} element
 */
Helpers.clearFlip = function(element) {
	if (element._flipFrame) window.cancelAnimationFrame(element._flipFrame), element._flipFrame = 0;
	element.style.translate = "";
	element.style.scale = "";
	element.style.transformOrigin = "";
	element.classList.remove("flipping");
};

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
Helpers.animateElement = function(element, onToggled, onTransitionEnd, onEnd, thisArg, timeout, flip) {
	/** @type {T} */
	var boundContext = thisArg || element;

	var callEnd = function() {
		if (!state.active) return;
		state.active = false;
		if (state.timer) clearTimeout(state.timer);
		if (state.frame) window.cancelAnimationFrame(state.frame);
		if (state.handler) element.removeEventListener(transitionEndEvent, state.handler, false);
		if (element._animationState === state) element._animationState = null;

		element.classList.remove("animating");
		if (flip) Helpers.clearFlip(element);
		if (onEnd) onEnd.call(boundContext);
	};

	var previous = element._animationState;
	if (previous && previous.cancel) previous.cancel();

	/** @type {{ timer: number, frame: number, handler: ((ev: TransitionEvent)=>void) | null, active: boolean, flip: boolean, cancel: () => void }} */
	var state = element._animationState = { timer: 0, frame: 0, handler: null, active: true, flip: !!flip, cancel: callEnd };

	if (!flags.useAnimations) {
		if (onToggled) onToggled.call(boundContext);
		return callEnd();
	}

	state.timer = timeout && setTimeout(callEnd, timeout) || 0;

	if (capabilities.supportsTransitions) {
		if (flip)
			Helpers.flipElement(element, onToggled, boundContext);
		else element.classList.add("animating");

		/** @type {(ev: TransitionEvent)=>void} */
		var animationHandler = function(event) {
			if (onTransitionEnd) {
				if (typeof onTransitionEnd === "string") {
					if (event.propertyName !== onTransitionEnd) return;
				} else if (!onTransitionEnd(event.propertyName)) return; // TODO these ifs can probably be made one
			}

			element.removeEventListener(transitionEndEvent, animationHandler, false);
			clearTimeout(state.timer);
			callEnd();
		};

		state.handler = animationHandler;
		element.addEventListener(transitionEndEvent, animationHandler, false);
	}

	if (!flip || !capabilities.supportsTransitions) {
		state.frame = window.requestAnimationFrame(function() {
			state.frame = 0;
			if (onToggled) onToggled.call(boundContext);
		});
	}
};

/**
 * @param {string} text
 * @returns {string}
 */
Helpers.formatCamelCase = function (text) {
    if (!text) return "";
    var result = text.replace(/([A-Z])/g, " $1");
    return result.charAt(0).toUpperCase() + result.slice(1);
};

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
	else this._transform.rotateX = x, this._transform.rotateY = y, this._transform.rotateZ = z;
	this.update(animate);
};

/** @param {HTMLElement} container */
function UIBuilder(container) {
	this.container = container;
}

/** @param {string} text */
UIBuilder.prototype.addHeader = function (text) {
	this.container.appendChild(Helpers.createHeader(text));
	return this;
};

/** @typedef {{ icon: string }} LVUIFileItem */
/** @typedef {({ label: string} & ({state: boolean, onInput: (enabled: boolean) => void} | {onClick: () => void} | LVUIFileItem)) | undefined} UIItem */
/** @typedef {Array<UIItem>} IOItemList */

/** @param {IOItemList} items */
UIBuilder.prototype.addList = function (items) {
	this.container.appendChild(Helpers.createList(items));
	return this;
};

/**
 * @param {{label: string, element: HTMLElement}[]} items
 * @param {HTMLElement} container
 */
UIBuilder.prototype.addNavList = function (items, container) {
	return this.addList(items.map(function (item) {
		return {label: item.label, onClick: function () {
			container.replaceChildren(item.element);
		}};
	}));
};


/** @param {{ name: string, icon: string, onFileClick?: Function, onFileDoubleClick?: Function }[]} files */
UIBuilder.prototype.addFileView = function (files, onFileClick, onFileDoubleClick) {
	var builder = this.addList(files.map(function (file) {
		return {
			label: file.name,
			icon: file.icon,
			onFileClick: file.onFileClick || onFileClick,
			onFileDoubleClick: file.onFileDoubleClick || onFileDoubleClick
		};
	}));
	Helpers.prepareFileDropTarget(closestFolderContent(this.container));
	return builder;
};

/** @param {Notification} n */
UIBuilder.prototype.addNotificationView = function (n) {
	var h = document.createElement("h1");
	var p = document.createElement("p");
	this.container.appendChild(h);
	this.container.appendChild(p);
	return this;
};

//#endregion

//#region VulpOS

/** @param {Flags} flags */
function VulpOS(flags) {
	this.wm = new WindowManager;
	this.flags = flags;
	this.Helpers = Helpers;
	/** @class */
	this.UIBuilder = UIBuilder;
}

/** @param {HTMLElement | string | null} element */
VulpOS.prototype.to = function (element) {
	if (typeof element === "string") element = document.getElementById(element);
	if (!element) throw new Error("Unable to find elementby ID");
	return new UIBuilder(element);
};

/** @param {"section"} [type] */
VulpOS.prototype.newTag = function (type) {
	return new UIBuilder(document.createElement(type || "section"));
};

/** @typedef {{title: string, description: strng}} Notification */

/** @param {Notification} notification */
VulpOS.prototype.pushNotification = function (notification) {
	var bubble = this.newTag().addNotificationView(notification).container;
	// TODO: make the bubble fly in and shit yeah!
};


var fileItemCounter = 0;

function closestFolderContent(element) {
	while (element && element.nodeType === 1) {
		if (element.classList && element.classList.contains("folder-content")) return element;
		element = element.parentNode;
	}
	return null;
}

Helpers.selectFileItem = function (element) {
	var scope = closestFolderContent(element) || document;
	var selected = scope.querySelectorAll(".file-item.selected");
	for (var i = 0; i < selected.length; i++)
		if (selected[i] !== element) selected[i].classList.remove("selected");
	if (element) element.classList.add("selected");
};

Helpers.selectFileItemsInRect = function (rect, additive, scope) {
	var items = (scope || document).querySelectorAll(".file-item");
	for (var i = 0; i < items.length; i++) {
		var itemRect = items[i].getBoundingClientRect();
		var hit = !(itemRect.right < rect.left || itemRect.left > rect.right || itemRect.bottom < rect.top || itemRect.top > rect.bottom);
		if (hit) items[i].classList.add("selected");
		else if (!additive) items[i].classList.remove("selected");
	}
};

function dockFileElement(element) {
	element.classList.remove("placed");
	element.style.position = "";
	element.style.left = "";
	element.style.top = "";
	element.style.margin = "";
}

function createFileElement(payload) {
	return Helpers.createList([{ label: payload.name, icon: payload.icon }]).firstChild;
}

function placeFileElement(element, folder, clientX, clientY) {
	var rect = folder.getBoundingClientRect();
	dockFileElement(element);
	if (element.parentNode) element.parentNode.removeChild(element);
	folder.appendChild(element);
	element.style.position = "absolute";
	element.style.left = Helpers.toPixels(clientX - rect.left - (element.offsetWidth || 80) / 2);
	element.style.top = Helpers.toPixels(clientY - rect.top - (element.offsetHeight || 88) / 2);
	element.style.margin = "0";
	element.classList.add("placed");
	Helpers.selectFileItem(element);
}

Helpers.addDesktopFile = function (file, clientX, clientY, onFileClick, onFileDoubleClick) {
	var folder = document.getElementById("desktop-folder");
	if (!folder || !file) return null;
	var list = Helpers.createList([{
		label: file.name,
		icon: "Assets/icon-192.png",
		onFileClick: onFileClick,
		onFileDoubleClick: onFileDoubleClick || function (droppedFile) { console.log(droppedFile); }
	}]);
	var element = list.firstChild;
	if (!element) return null;
	element.lvFile = file;
	placeFileElement(element, folder, clientX, clientY);
	return element;
};

Helpers.getDesktopFile = function (element) {
	return element ? element.lvFile : null;
};

function hasFilePayload(ev) {
	var types = ev.dataTransfer && ev.dataTransfer.types;
	if (!types) return false;
	try { return Array.prototype.indexOf.call(types, "application/x-lvos-file") !== -1; }
	catch (ex) { return false; }
}

Helpers.hasLvosFilePayload = hasFilePayload;

window.addEventListener("dragover", function (ev) {
	if (!hasFilePayload(ev)) return;
	ev.preventDefault();
	if (ev.dataTransfer) ev.dataTransfer.dropEffect = "move";
}, true);

window.addEventListener("drop", function (ev) {
	if (!hasFilePayload(ev)) return;
	var raw = ev.dataTransfer.getData("application/x-lvos-file");
	if (!raw) return;
	ev.preventDefault();
	ev.stopPropagation();

	var payload;
	try { payload = JSON.parse(raw); } catch (ex) { return; }
	var source = payload.id && document.getElementById(payload.id);
	if (!source) source = createFileElement(payload);

	var folder = closestFolderContent(ev.target) || document.getElementById("desktop-folder") || document.body;
	var node = ev.target;
	var inList = false;
	while (node && node !== folder) {
		if (node.nodeName === "UL") { inList = true; break; }
		node = node.parentNode;
	}
	console.log('drop debug', JSON.stringify({ payload: payload, sourceFound: !!source, parent: source && source.parentNode && source.parentNode.id, folder: folder.id, inList: inList }));

	if (!inList) placeFileElement(source, folder, ev.clientX, ev.clientY);
	else {
		dockFileElement(source);
		(folder.querySelector("ul") || folder).appendChild(source);
		Helpers.selectFileItem(source);
	}
}, true);

Helpers.prepareFileDropTarget = function (folder) {
	if (!folder || folder._fileDropTargetReady) return;
	folder._fileDropTargetReady = true;

	folder.addEventListener("dragover", function (ev) {
		ev.preventDefault();
		if (ev.dataTransfer) ev.dataTransfer.dropEffect = "move";
	}, false);

	folder.addEventListener("drop", function (ev) {
		if (!ev.dataTransfer) return;
		var raw = ev.dataTransfer.getData("application/x-lvos-file");
		if (!raw) return;
		ev.preventDefault();
		ev.stopPropagation();

		var payload;
		try { payload = JSON.parse(raw); } catch (ex) { return; }
		var source = payload.id && document.getElementById(payload.id);
		if (!source) source = createFileElement(payload);

		var node = ev.target;
		var inList = false;
		while (node && node !== folder) {
			if (node.nodeName === "UL") { inList = true; break; }
			node = node.parentNode;
		}

		if (!inList) {
			placeFileElement(source, folder, ev.clientX, ev.clientY);
			return;
		}

		dockFileElement(source);
		(folder.querySelector("ul") || folder).appendChild(source);
		Helpers.selectFileItem(source);
	}, false);
};

Helpers.prepareFileItem = function (element, item) {
	var downEvent = capabilities.supportsPointer ? "pointerdown" : "mousedown";
	element.id = "lv-file-" + (++fileItemCounter);
	element.draggable = true;

	element.addEventListener(downEvent, function (ev) {
		if (ev.button !== undefined && ev.button !== 0) return;
		ev.stopPropagation();
		Helpers.selectFileItem(element);
	}, false);

	element.addEventListener("click", function () {
		if (item.onFileClick) item.onFileClick(element.lvFile || null, element);
	}, false);

	element.addEventListener("dblclick", function () {
		if (item.onFileDoubleClick) item.onFileDoubleClick(element.lvFile || null, element);
	}, false);

	element.addEventListener("dragstart", function (ev) {
		if (!ev.dataTransfer) return;
		ev.dataTransfer.effectAllowed = "move";
		ev.dataTransfer.setData("application/x-lvos-file", JSON.stringify({
			id: element.id,
			name: item.label,
			icon: item.icon
		}));
		ev.dataTransfer.setData("text/plain", item.label);
		Helpers.selectFileItem(element);
		element.classList.add("dragging");
	}, false);

	element.addEventListener("dragend", function () { element.classList.remove("dragging"); }, false);
};

/** @param {IOItemList} items */
Helpers.createList = function (items) {
	var list = document.createElement("ul");

	items.forEach(function (item) {
		if (!item) return;
		var li = document.createElement("li");

		if ("state" in item) { // Checkbox/toggle
			var label = document.createElement("label");
			label.appendChild(document.createTextNode(item.label));

			var toggle = document.createElement("input");
			toggle.type = "checkbox";
			toggle.checked = !!item.state;
			toggle.onchange = function () { item.onInput(toggle.checked); };

			label.appendChild(toggle);
			li.appendChild(label);
		} else if ("onClick" in item) { // Button?
			var button = document.createElement("button");
			button.onclick = function () { item.onClick(); };
			button.textContent = item.label;

			li.appendChild(button);
		} else if ("icon" in item) { // File!
			var image = document.createElement("img");
			image.src = item.icon;
			image.draggable = false;
			var label = document.createElement("label");
			label.textContent = item.label;

			li.className = "file-item";
			li.appendChild(image);
			li.appendChild(label);
			Helpers.prepareFileItem(li, {
				label: item.label,
				icon: item.icon,
				onFileClick: item.onFileClick,
				onFileDoubleClick: item.onFileDoubleClick
			});
		}
		list.appendChild(li);
	});

	return list;
};

/** @param {string} text */
Helpers.createHeader = function(text) {
	var h = document.createElement("h2");
	h.appendChild(document.createTextNode(text));
	return h;
};

//#endregion