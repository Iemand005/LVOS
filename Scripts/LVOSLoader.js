/** @class */
function Loader() { }

/**
 * Shared cross-browser helper for DOM/script readiness
 * @param {Document | HTMLScriptElement} target
 * @param {string} modernEvent
 * @param {(this: any, ev?: any) => any} fn
 */
Loader._onEventReady = function (target, modernEvent, fn) {
	var done = false;

	/** @param {any} [ev] */
	function finish(ev) {
		if (!done) {
			done = true;
			fn.call(target, ev);
		}
	}

	// If already complete (works for both document and cached scripts in IE)
	if (target.readyState === "complete") {
		finish();
		return;
	}

	if (target.addEventListener) {
		target.addEventListener(modernEvent, finish, false);
	} else if (/** @type {any} */ (target).attachEvent) {
		/** @type {any} */ (target).attachEvent("onreadystatechange", function () {
		if (target.readyState === "complete" || (target !== document && target.readyState === "loaded")) {
			finish(window.event);
		}
	});
	}
};

/** @param {() => void} fn */
Loader.onReady = function (fn) {
	if (document.readyState === "interactive" && !document.attachEvent)
		return fn();
	Loader._onEventReady(document, "DOMContentLoaded", fn);
};

/** @param {string} url */
Loader.loadStyleSheet = function (url) {
	var head = document.head || document.getElementsByTagName("head")[0] || document.documentElement;
	var link = document.createElement("link");
	link.rel = "stylesheet";
	link.type = "text/css";
	link.href = url;

	head.appendChild(link);
};

/**
 * @param {string} url
 * @param {GlobalEventHandlers["onload"]} [onLoad]
 */
Loader.loadScript = function (url, onLoad) {
	var head = document.head || document.getElementsByTagName("head")[0] || document.documentElement;
	var script = document.createElement("script");
	script.type = "text/javascript";
	script.src = url;
	script.defer = true;

	if (onLoad) Loader._onEventReady(script, "load", onLoad);

	head.appendChild(script);
};

/**
 * @param {Element | null} el
 * @param {string} attrName
 */
function hasAttributeCompat(el, attrName) {
	return el && (typeof el.hasAttribute === "function" ? el.hasAttribute(attrName) : typeof el.getAttribute(attrName) === "string");
}

/** @returns {HTMLScriptElement | null} */
function getCurrentScriptCompat() {
	if (document.currentScript && "src" in document.currentScript) {
		return document.currentScript;
	}

	var scripts = document.getElementsByTagName("script");
	for (var i = scripts.length - 1; i >= 0; i--) {
		var script = scripts[i];
		if (!script) return null;
		var src = script.src || "";
		if (src.indexOf("LVOSLoader.js") !== -1)
			return script;
	}
	return null;
}

// 1. Capture the script tag IMMEDIATELY while executing synchronously
var loaderScript = getCurrentScriptCompat();
var hasTheme = hasAttributeCompat(loaderScript, "data-theme");

// 2. Wait for DOM ready to inject styles and Messenger.js
Loader.onReady(function () {
	if (loaderScript) {
		var scriptSrc = loaderScript.src;
		var scriptDir = scriptSrc.substring(0, scriptSrc.lastIndexOf("/") + 1);

		Loader.loadStyleSheet(scriptDir + "../Styles/general.css");

		if (hasTheme) {
			console.log("LVOSLoader: data-theme detected!");
			Loader.loadStyleSheet(scriptDir + "../Styles/themes.css");
		} else {
			console.log("LVOSLoader: no data-theme attribute.");
		}

		Loader.loadScript(scriptDir + "Messenger.js", function () {
			console.log("Messenger.js loaded!");
		});
	}
});
