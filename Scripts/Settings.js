// Settings handler
// Lasse Lauwerys © 2024

'use strict';
'use esnext';

var STORAGE_FILE = "app_storage.json";

// var metaThemeColor = document.querySelector('meta[name="theme-color"]');


var supportsActiveX = typeof ActiveXObject != "undefined";

function ActiveXStorage() {
	if (!ActiveXObject) throw new Error("ActiveX not supported!");
	this.fso = new ActiveXObject("Scripting.FileSystemObject");
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

SettingsHandler.prototype.get = function (key) { if (this.storage) return this.storage.getItem(key) },
SettingsHandler.prototype.set = function (key, value) { if (this.storage) this.storage.setItem(key, value); }

/** @param {{[key:string]: boolean}} flags */
SettingsHandler.prototype.loadFlags = function (flags) {
	var flagsElement = document.createElement("article");
	for (var flagId in flags) {
		if (!flags.hasOwnProperty(flagId)) continue;
		var flag = flags[flagId];
		/** @type {HTMLElement?} */
		var settingElement = document.createElement("label");
		switch (typeof flag) {
			case "boolean":
				var toggle = document.createElement("input");
				toggle.type = "checkbox";
				toggle.checked = flag;
				settingElement.appendChild(document.createTextNode(flagId));
				settingElement.appendChild(toggle);
				break;
		}
		if (!settingElement) return;
		flagsElement.appendChild(settingElement);
	}
	var settingsElement = document.getElementById("settings");
	if (settingsElement) settingsElement.appendChild(flagsElement);
};

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
	if (!isCharmsOpen() || clickedElement == charmsbutton) return;

	if(!(clickedElement == elements.charms || elements.charms.contains(clickedElement))) {
		//if(clickedElement == charmsbutton || clickedElement == charmsbutton2) toggleCharms();
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
	for (var index in windows) {
		var dialog = windowManager.windows[index];
		if (!dialog || !dialog.target) continue;
		var content = dialog.target.getElementsByTagName("content")[0];
		if (!(content instanceof HTMLElement)) continue;
		content.style.backgroundColor = color;
		content.style.color = isWhite ? "white" : "black";
	}
	if (metaThemeColor) metaThemeColor.setAttribute('content', color);
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
	setColor(settings.get("color"));
	setAccentColor(settings.get("accentColor"));
	setTheme(settings.get("theme"));
	// getBorderSize(settings.get("borderSize"));
	updateBlurState();
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
	dockAppList: null
};

function loadElements() {
	elements.desktop = document.getElementById("desktop");
	elements.charms = document.getElementById("charms");
	elements.color = document.getElementById("color");
	elements.accent = document.getElementById("accent");
	elements.resetColor = document.getElementById("resetaccent");
	elements.resetAccent = document.getElementById("resetaccent");
	elements.border = document.getElementById("border");
	elements.dockAppList = document.getElementById("dockapplist");

	// // bodyCrawler.settings ? bodyCrawler.settings.onsubmit = function (ev) { ev.preventDefault(); };
	// // bodyCrawler.getth.onchange = function () { setThemeOld(this.selectedIndex); };
	// reflectionToggle.onchange = function (ev) { toggleReflections(ev.target.checked); }
	// blurToggle.onchange = function (ev) { toggleBlur(ev.target.checked); }
	// elements.resetAccent.onclick = setAccentColor.bind(this, "");
	if (elements.border) elements.border.oninput = elements.border.onchange = function () { setBorderSize(this.value); };
	if (elements.accent) elements.accent.oninput = elements.accent.onchange = function () { setAccentColor(this.value); };
	if (elements.color) elements.color.oninput = elements.color.onchange = function () { setColor(this.value); };
	if (charmsbutton) charmsbutton.onclick  = toggleCharms;


	settings.loadFlags(flags);
};

addEventListener("load", function() {
	loadElements();
	loadSettings();
}, false);

var metroAppList = document.getElementById("metroapplist");
// var blurToggle = document.getElementById("blurtoggle");
// var reflectionToggle = document.getElementById("reflectiontoggle");

var charmsbutton = applist ? applist.appendChild(document.createElement("button")) : document.createElement("button");
// var charmsbutton2 = elements.dockAppList.appendChild(document.createElement("button"));

// if (windowManager.windows && windowManager.windows.browser)
//     elements.dockAppList.appendChild(windowManager.windows.browser.createOpenButton());

// // var settingsThing = bodyCrawler.getS

// metroAppList.classList.toggle("bottom", true);

charmsbutton.textContent = "Settings";
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

function loadFlags() {
	for (var key in flags) {
		// 1. Skip the internal storage variable completely
		if (key === "_useTransform") {
			continue;
		}

		// 2. Create a wrapper container for this setting row
		var row = document.createElement("div");

		// 3. Create the checkbox input element
		var checkbox = document.createElement("input");
		checkbox.type = "checkbox";
		checkbox.id = "flag-" + key;
		
		// Reading flags[key] safely triggers your standard value OR your custom getter!
		checkbox.checked = flags[key]; 

		// 4. Attach an event listener (using attachEvent / addEventListener fallback for safety)
		(function(currentKey, currentCheckbox) {
			var changeHandler = function() {
			// Writing to flags[key] updates standard values OR triggers your custom setter!
			flags[currentKey] = currentCheckbox.checked; 
			};

			if (currentCheckbox.addEventListener) {
			currentCheckbox.addEventListener("change", changeHandler, false);
			} else if (currentCheckbox.attachEvent) { // For old IE compatibility if needed
			currentCheckbox.attachEvent("onchange", changeHandler);
			}
		})(key, checkbox);

		var label = document.createElement("label");
		label.htmlFor = "flag-" + key;
		label.appendChild(document.createTextNode(" " + key));

		row.appendChild(checkbox);
		row.appendChild(label);
		container.appendChild(row);
	}
}