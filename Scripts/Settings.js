// Settings handler
// Lasse Lauwerys © 2024

'use strict';
'use esnext';

var STORAGE_FILE = "app_storage.json";

// var metaThemeColor = document.querySelector('meta[name="theme-color"]');

/**
 * @param {string} text
 * @returns {string}
 */
function formatCamelCase(text) {
    if (!text) return "";
    var result = text.replace(/([A-Z])/g, " $1");
    return result.charAt(0).toUpperCase() + result.slice(1);
}


var supportsActiveX = typeof ActiveXObject != "undefined";

function ActiveXStorage() {
	if (!window.ActiveXObject) throw new Error("ActiveX not supported!");
	this.fso = new window.ActiveXObject("Scripting.FileSystemObject");
}

ActiveXStorage.prototype.setItem = function(key, value) {
	var data = {};
	
	if (this.fso.FileExists(STORAGE_FILE)) {
		try {
			var readFile = this.fso.OpenTextFile(STORAGE_FILE, 1);
			data = JSON.parse(readFile.ReadAll());
			readFile.Close();
		} catch(e) { data = {}; }
	}
	
	data[key] = value;
	
	var writeFile = this.fso.OpenTextFile(STORAGE_FILE, 2, true);
	writeFile.Write(JSON.stringify(data));
	writeFile.Close();
};
	
ActiveXStorage.prototype.getItem = function(key) {
	if (!this.fso.FileExists(STORAGE_FILE)) return null;
	
	try {
		var readFile = this.fso.OpenTextFile(STORAGE_FILE, 1);
		var data = JSON.parse(readFile.ReadAll());
		readFile.Close();
		return data[key] != undefined ? data[key] : null;
	} catch(e) {
		return null;
	}
};

// if (!window.localStorage) {
	// var activeStorage = new ActiveXStorage();

	// window.localStorage = activeStorage;
	
	// activeStorage.setItem("hi", 69);
// }

function SettingsHandler() { // First class declarations, then the functions and as last the initialisation. The defer attribute does give us the ability to call functions before declaration since the file is loaded and parsed, but only gets executed after the DOM and all other files get loaded.
	this.storage = typeof localStorage != "undefined" && localStorage || supportsActiveX && new ActiveXStorage();
}

SettingsHandler.prototype.get = function (key) {
	if (!this.storage) return null;
	var value = this.storage.getItem(key);
	if (value == null) return null;
	try { return JSON.parse(value); } catch (ex) { return value; }
};
SettingsHandler.prototype.set = function (key, value) { if (this.storage) this.storage.setItem(key, value); };

/** @param {{[key:string]: boolean}} flags */
SettingsHandler.prototype.saveFlags = function (flags) {
	var saved = {};
	for (var flagId in flags) {
		if (!flags.hasOwnProperty(flagId) || flagId.charAt(0) === "_") continue;
		saved[flagId] = flags[flagId];
	}
	this.set("flags", JSON.stringify(saved));
};

/** @param {{[key:string]: boolean}} flags */
SettingsHandler.prototype.restoreFlags = function (flags) {
	var saved = this.get("flags");
	if (!saved || typeof saved != "object") return;
	for (var flagId in saved) {
		if (!saved.hasOwnProperty(flagId)) continue;
		if (typeof flags[flagId] == "boolean" && typeof saved[flagId] == "boolean") {
			flags[flagId] = saved[flagId];
		}
	}
};

/** @param {{[key:string]: boolean}} flags */
SettingsHandler.prototype.loadFlags = function (flags) {
	var handler = this;
	handler.restoreFlags(flags);
	var flagsElement = document.createElement("ul");
	for (var flagId in flags) {
		if (!flags.hasOwnProperty(flagId) || flagId.charAt(0) === "_") continue;
		var flag = flags[flagId];
		/** @type {HTMLElement | null} */
		var settingElement = document.createElement("label");

		var flagValue = flags[flagId];

		switch (typeof flag) {
			case "boolean":
				var row = document.createElement("li");

				(function(currentKey) {
					var toggle = document.createElement("input");
					toggle.type = "checkbox";
					toggle.id = "flag-" + flagId;
					toggle.checked = flagValue;

                    toggle.addEventListener("change", function() {
                        flags[currentKey] = toggle.checked;
                        handler.saveFlags(flags);
                    }, false);

					var label = document.createElement("label");
					label.htmlFor = toggle.id;
					label.appendChild(document.createTextNode(formatCamelCase(flagId)));

					row.appendChild(toggle);
					row.appendChild(label);

					flagsElement.appendChild(row);
				})(flagId);

				break;
		}
		if (!settingElement) return;
		flagsElement.appendChild(settingElement);
	}
	var settingsElement = document.getElementById("settings");
	if (settingsElement) settingsElement.appendChild(flagsElement);
};

/** The body-level theme classes available in Styles/themes.css. */
var THEMES = ["blur", "default-theme", "flippy", "glass", "gnome", "mac-os", "mica", "modern", "modern-blur", "windows", "windows-10", "windows-11", "windows-95"];

/** Base themes that other themes rely on. */
var BASE_THEMES = {
	"windows-95": "windows",
	"windows-10": "windows",
	"windows-11": "windows",
	"mac-os": "modern"
};

/** @param {string} theme */
function applyStartButtonIcon(theme) {
	var startButton = document.getElementById("start-button");
	if (!startButton) return;
	if (theme == "windows-10") {
		var logoIcon = document.createElement("img");
		logoIcon.onload = function () {
			if (startButton){
				startButton.innerText = "";
				startButton.appendChild(logoIcon);
			}
		};
		logoIcon.src = "Assets/Windows-10.svg";
	} else if (startButton.getElementsByTagName("img").length) {
		startButton.innerText = "Start";
	}
}

/** @param {string} theme */
function setThemeOption(theme) {
	var previous = settings.get("theme");
	var blurWasOn = previous == "blur" || previous == "glass" || previous == "modern-blur";
	var previousBase = BASE_THEMES[previous];
	if (previous && previous != theme) {
		if (THEMES.indexOf(previous) != -1) removeTheme(previous);
		if (previous == "glass") removeTheme("blur");
		if (previous == "modern-blur") {
			removeTheme("blur");
			removeTheme("modern");
		}
		if (previousBase) removeTheme(previousBase);
	}
	if (theme && THEMES.indexOf(theme) != -1) {
		if (theme != "modern-blur") setTheme(theme);
		if (theme == "glass") setTheme("blur");
		if (theme == "modern-blur") {
			setTheme("modern");
			setTheme("blur");
		}
		if (BASE_THEMES[theme]) setTheme(BASE_THEMES[theme]);
		applyStartButtonIcon(theme);
		settings.set("theme", theme);
	} else {
		removeTheme("blur");
		removeTheme("glass");
		settings.set("theme", "");
	}
	if (theme == "blur" || theme == "glass") removeTheme("modern");
	else if (blurWasOn && theme != "modern-blur") setTheme("modern");
}

/** @param {boolean} enabled */
function toggleColorDebug(enabled) {
	document.body.classList.toggle("color-debug", enabled);
	settings.set("color-debug", enabled);
}

/** @param {boolean} enabled */
function toggleSquircles(enabled) {
	document.body.classList.toggle("squircles", enabled);
	settings.set("squircles", enabled);
}

/** @param {number} id */
function setThemeOld(id) {
	if (typeof id == 'undefined') return;
	settings.set("theme", id);
	for(var index in windowManager.windows){
		var window = windowManager.windows[index];
	var target = window.target;
	if (!target) continue;
		switch (id) {
			case 0: target.classList.remove("rounded-corners"), target.classList.add("sharp-corners");
				break;
			case 1: target.classList.remove("rounded-corners"), target.classList.remove("sharp-corners");
				break;
			case 2: target.classList.remove("sharp-corners"), target.classList.add("rounded-corners");
				break;
		}
	}
}

function toggleCharmsEvent(ev) {
	if (!document.elementFromPoint) return;
	var clickedElement = document.elementFromPoint(ev.clientX, ev.clientY);
	if (!isCharmsOpen() || clickedElement == charmsButton) return;

	if(!(clickedElement == elements.charms || elements.charms.contains(clickedElement))) {
		//if(clickedElement == charmsButton || clickedElement == charmsbutton2) toggleCharms();
	//else 
		toggleCharms(false);
	}
}

/** @param {number} size */
function setBorderSize(size) {
	settings.set("borderSize", size);
	for (var index in windowManager.windows) windowManager.windows[index].borderSize = size;
}

function hexToRGB(hex) {
	if (typeof hex == 'undefined' || !hex) return;
	// var int = parseInt(hex.replace('#', ''), 16);
	var bla = 0;
	return {r: (bla >> 16) & 255, g: (bla >> 8) & 255, b: bla & 255};
}

function isColorDark(color) {
	if (typeof color == 'undefined') return;
	var rgb = hexToRGB(color);
	if (!rgb) return false;
	return 0.2126*rgb.r + 0.7152*rgb.g + 0.0722*rgb.b < 128;
}

function setColor(color){
	if (typeof color == 'undefined' || !(elements.color instanceof HTMLInputElement)) return;
	settings.set("color", elements.color.value = color);
	
	var isWhite = isColorDark(color);
	for (var index in 	windowManager.windows) {
		var dialog = windowManager.windows[index];
		if (!dialog || !dialog.target) continue;
		var content = dialog.target.getElementsByTagName("content")[0];
		if (!(content instanceof HTMLElement)) continue;
		content.style.backgroundColor = color;
		content.style.color = isWhite ? "white" : "black";
	}
	if (window.metaThemeColor) window.metaThemeColor.setAttribute('content', color);
}

function setAccentColor(color) {
	settings.set("accentColor", elements.accent.value = color);
	var isWhite = isColorDark(color);
	var metroStyle = document.getElementById("metro").style, charmStyle = document.getElementById("charms").style;
	metroStyle.backgroundColor = charmStyle.backgroundColor = color;
	metroStyle.color = charmStyle.color = isWhite?"white":"black";
	// document.getElementById("metro").style.backgroundColor = document.getElementById("charms").style.backgroundColor = color;;

}

function loadSettings() {
	loadThemeSetting();
	setColor(settings.get("color"));
	setAccentColor(settings.get("accentColor"));
	// getBorderSize(settings.get("borderSize"));
	updateBlurState();
}

function loadThemeSetting() {
	var theme = settings.get("theme");
	if (THEMES.indexOf(theme) != -1) {
		// Clear any hardcoded/default theme classes on <body> so the stored theme applies cleanly.
		for (var i = 0; i < THEMES.length; i++) document.body.classList.remove(THEMES[i]);
		for (var base in BASE_THEMES) {
			if (BASE_THEMES.hasOwnProperty(base)) document.body.classList.remove(BASE_THEMES[base]);
		}
		if (theme != "modern-blur") setTheme(theme);
		if (theme == "glass") setTheme("blur");
		if (theme == "modern-blur") {
			setTheme("modern");
			setTheme("blur");
		}
		if (BASE_THEMES[theme]) setTheme(BASE_THEMES[theme]);
		if (theme == "blur" || theme == "glass") removeTheme("modern");
		applyStartButtonIcon(theme);
		if (elements.theme) elements.theme.value = theme;
	}
	var colorDebug = settings.get("color-debug");
	if (typeof colorDebug == "boolean") {
		document.body.classList.toggle("color-debug", colorDebug);
		if (elements.colorDebug) elements.colorDebug.checked = colorDebug;
	}
	var squircles = settings.get("squircles");
	if (typeof squircles == "boolean") {
		document.body.classList.toggle("squircles", squircles);
		if (elements.squircles) elements.squircles.checked = squircles;
	}
}

function updateBlurState() {
	var a = settings.get("blur");
	// toggleBlur(JSON.parse(a));
}

var settings = new SettingsHandler();

/** @type {{[key:string]: HTMLElement?}} */
var elements = {
	desktop: null,
	charms: null,
	color: null,
	accent: null,
	resetColor: null,
	resetAccent: null,
	border: null,
	dockAppList: null,
	theme: null,
	colorDebug: null,
	squircles: null,
	noBlurFullscreen: null,
	installAppUrl: null,
	installAppButton: null,
	installAppProxiedButton: null
};

function installAppFromUrl(useProxy) {
	var url = (elements.installAppUrl && elements.installAppUrl.value || "").trim();
	if (!url) return;
	if (useProxy && windowManager && typeof windowManager.installAppProxied == "function") {
		windowManager.installAppProxied(url);
		if (elements.installAppUrl) elements.installAppUrl.value = "";
		return;
	}
	if (windowManager && typeof windowManager.installApp == "function") {
		windowManager.installApp(url);
		if (elements.installAppUrl) elements.installAppUrl.value = "";
	}
}

function loadElements() {
	elements.desktop = document.getElementById("desktop");
	elements.charms = document.getElementById("charms");
	elements.color = document.getElementById("color");
	elements.accent = document.getElementById("accent");
	elements.resetColor = document.getElementById("resetaccent");
	elements.resetAccent = document.getElementById("resetaccent");
	elements.border = document.getElementById("border");
	elements.dockAppList = document.getElementById("dockapplist");
	elements.theme = document.getElementById("theme");
	elements.colorDebug = document.getElementById("color-debug");
	elements.squircles = document.getElementById("squircles");
	elements.noBlurFullscreen = document.getElementById("no-blur-fullscreen");
	elements.installAppUrl = document.getElementById("install-app-url");
	elements.installAppButton = document.getElementById("install-app-button");
	elements.installAppProxiedButton = document.getElementById("install-app-proxied-button");

	// // bodyCrawler.settings ? bodyCrawler.settings.onsubmit = function (ev) { ev.preventDefault(); };
	// // bodyCrawler.getth.onchange = function () { setThemeOld(this.selectedIndex); };
	// reflectionToggle.onchange = function (ev) { toggleReflections(ev.target.checked); }
	// blurToggle.onchange = function (ev) { toggleBlur(ev.target.checked); }
	// elements.resetAccent.onclick = setAccentColor.bind(this, "");
	if (elements.border) elements.border.oninput = elements.border.onchange = function () { setBorderSize(this.value); };
	if (elements.accent) elements.accent.oninput = elements.accent.onchange = function () { setAccentColor(this.value); };
	if (elements.color) elements.color.oninput = elements.color.onchange = function () { setColor(this.value); };
	if (elements.theme) elements.theme.onchange = function () { setThemeOption(this.value); };
	if (elements.colorDebug) elements.colorDebug.onchange = function () { toggleColorDebug(this.checked); };
	if (elements.squircles) elements.squircles.onchange = function () { toggleSquircles(this.checked); };
	if (elements.noBlurFullscreen) elements.noBlurFullscreen.onchange = function () { toggleNoBlurFullscreen(this.checked); };
	if (elements.installAppButton) elements.installAppButton.onclick = function () { installAppFromUrl(false); };
	if (elements.installAppProxiedButton) elements.installAppProxiedButton.onclick = function () { installAppFromUrl(true); };
	if (elements.installAppUrl && elements.installAppUrl.form) {
		elements.installAppUrl.form.addEventListener("submit", function (event) {
			event.preventDefault();
			installAppFromUrl(false);
		}, false);
	}
	if (charmsButton) charmsButton.onclick  = toggleCharms;


	settings.loadFlags(flags);
}

addEventListener("load", function() {
	loadElements();
	loadSettings();
}, false);

var metroAppList = document.getElementById("metroapplist");
// var blurToggle = document.getElementById("blurtoggle");
// var reflectionToggle = document.getElementById("reflectiontoggle");

var charmsButton = applist ? applist.appendChild(document.createElement("button")) : document.createElement("button");
// var charmsbutton2 = elements.dockAppList.appendChild(document.createElement("button"));

// if (windowManager.windows && windowManager.windows.browser)
//     elements.dockAppList.appendChild(windowManager.windows.browser.createOpenButton());

// // var settingsThing = bodyCrawler.getS

// metroAppList.classList.toggle("bottom", true);

charmsButton.textContent = "Settings";
// charmsbutton2.innerText = "Settings";

window.addEventListener("mousedown", toggleCharmsEvent, false);


/**
 * @param {*} object 
 * @param {string} [fileName] 
 */
function downloadObject(object, fileName) {
	var uri = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(object));

	var a = document.createElement('a');
	a.setAttribute("href", uri);
	a.setAttribute("download", fileName || "öbject" + ".json");
	
	document.body.appendChild(a);     
	a.click();
	document.body.removeChild(a);
}

function downloadSettings() {
	downloadObject(localStorage);
}