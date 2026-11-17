
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
	if (document.readyState === 'complete') {
		fn();
	} else if (document.addEventListener) {
		document.addEventListener('DOMContentLoaded', fn, false);
	} else if (document.attachEvent) {
		document.attachEvent('onreadystatechange', function () {
			if (document.readyState === 'complete') {
				fn();
			}
		});
	}
};


var scriptSrc = document.currentScript && "src" in document.currentScript && document.currentScript.src;
if (scriptSrc) {
	var scriptDir = scriptSrc.substring(0, scriptSrc.lastIndexOf("/") + 1);
	var stylePath = scriptDir + "../Styles/general.css";
	console.log("Currently in", scriptDir, "wanna load css in", stylePath);

	Loader.loadStyleSheet(stylePath);
}