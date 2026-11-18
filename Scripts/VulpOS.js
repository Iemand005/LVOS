
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

//#endregion

//#region VulpOS

function VulpOS() {
	this.wm = new WindowManager;
}

/**
 * @param {Array<{ label: string} & {state: boolean, onInput: (enabled: boolean) => void}>} items
 */
VulpOS.prototype.createInputList = function (items) {
	var list = document.createElement("ul");

	items.forEach(function (item) {
		var li = document.createElement("li");
		li.appendChild(document.createTextNode(item.label));

		var toggle = document.createElement("input");
		toggle.type = "checkbox";
		toggle.checked = !!item.state;
		toggle.onchange = function () { item.onInput(toggle.checked); };

		li.appendChild(toggle);
		list.appendChild(li);
	});

	return list;
};

//#endregion