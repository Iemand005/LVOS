
/** @class */
function Loader() { }

/** @param {string} url */
Loader.loadStyleSheet = function (url) {
	var link = document.createElement("link");
	link.rel = "stylesheet";
	link.type = "text/css";
	link.href = url;

	document.head.appendChild(link);

};

/**
 * @param {string} url
 * @param {GlobalEventHandlers['onload']} onLoad
 */
Loader.loadScript = function (url, onLoad) {
	var script = document.createElement("script");
	script.src = url;

	script.onload = onLoad;

	document.head.appendChild(script);
};

/** @param {()=>void} fn */
Loader.onReady = function (fn) {
	if (document.readyState === "complete") {
		fn();
	} else if (document.addEventListener) {
		document.addEventListener("DOMContentLoaded", fn, false);
	} else if (document.attachEvent) {
		document.attachEvent("onreadystatechange", function () {
			if (document.readyState === "complete") {
				fn();
			}
		});
	}
};

Loader.onReady(function () {

	var scriptSrc = document.currentScript && "src" in document.currentScript && document.currentScript.src;
	if (scriptSrc) {
		var scriptDir = scriptSrc.substring(0, scriptSrc.lastIndexOf("/") + 1);
		var stylePath = scriptDir + "../Styles/general.css";
		console.log("Currently in", scriptDir, "wanna load css in", stylePath);

		Loader.loadStyleSheet(stylePath);
	}
});

function hasAttributeCompat(el: Element | null, attrName: string): boolean {
	if (!el) return false;

	// Modern browsers & IE8+
	if (typeof el.hasAttribute === 'function') {
		return el.hasAttribute(attrName);
	}

	// Legacy IE (IE 5.5 - IE 7) fallback
	var attrNode = el.getAttributeNode ? el.getAttributeNode(attrName) : null;
	if (attrNode) {
		return attrNode.specified;
	}

	var val = el.getAttribute(attrName);
	return val !== null && val !== undefined;
}