// Settings handler
// Lasse Lauwerys © 2024

'use strict';
'use esnext';

var STORAGE_FILE = "app_storage.json";

var supportsActiveX = typeof ActiveXObject !== "undefined";

function ActiveXStorage() {
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
        return data[key] !== undefined ? data[key] : null;
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
    this.storage = typeof localStorage !== "undefined" && localStorage || supportsActiveX && new ActiveXStorage();
}

SettingsHandler.prototype.get = function (key) { if (this.storage) return this.storage.getItem(key) },
SettingsHandler.prototype.set = function (key, value) { if (this.storage) this.storage.setItem(key, value); }

function setThemeOld(id) {
    if (typeof id === 'undefined') return;
    settings.set("theme", id);
    for(var index in windows){
        var window = windowManager.windows[index];
        switch (id) {
            case 0: window.target.classList.remove("rounded-corners"), window.target.classList.add("sharp-corners");
                break;
            case 1: window.target.classList.remove("rounded-corners"), window.target.classList.remove("sharp-corners");
                break;
            case 2: window.target.classList.remove("sharp-corners"), window.target.classList.add("rounded-corners");
                break;
        }
    }
}

function toggleCharmsEvent(ev) {
    if (!document.elementFromPoint) return;
    var clickedElement = document.elementFromPoint(ev.clientX, ev.clientY);
    if (!isCharmsOpen() || clickedElement == charmsbutton || clickedElement == charmsbutton2) return;

    if(!(clickedElement == bodyCrawler.charms || bodyCrawler.charms.contains(clickedElement))) {
        //if(clickedElement == charmsbutton || clickedElement == charmsbutton2) toggleCharms();
    //else 
        toggleCharms(false);
    }
}

function setBorderSize(size) {
    settings.set("borderSize", size);
    for (/*let*/var index in windows) windowManager.windows[index].borderSize = size;
}

function hexToRGB(hex) {
    if (typeof hex === 'undefined' || !hex) return;
    // var int = parseInt(hex.replace('#', ''), 16);
    var bla = 0;
    return {r: (bla >> 16) & 255, g: (bla >> 8) & 255, b: bla & 255};
}

function isColorDark(color) {
    if (typeof color === 'undefined') return;
    var rgb = hexToRGB(color);
    if (!rgb) return false;
    return 0.2126*rgb.r + 0.7152*rgb.g + 0.0722*rgb.b < 128;
}

function setColor(color){
    if (typeof color === 'undefined' || !(elements.color instanceof HTMLInputElement)) return;
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
    color: null,
    accent: null,
    resetColor: null,
    resetAccent: null,
    border: null,
    dockAppList: null
};

function loadElements() {
    elements.desktop = document.getElementById("desktop");
    elements.color = document.getElementById("color");
    elements.accent = document.getElementById("accent");
    elements.resetColor = document.getElementById("resetaccent");
    elements.resetAccent = document.getElementById("resetaccent");
    elements.border = document.getElementById("border");
    elements.dockAppList = document.getElementById("dockapplist");
};

document.addEventListener("load", function() {
    loadElements();
    loadSettings();
}, false);

var metroAppList = document.getElementById("metroapplist");
// var blurToggle = document.getElementById("blurtoggle");
// var reflectionToggle = document.getElementById("reflectiontoggle");
// // var charmsbutton = applist.appendChild(document.createElement("button"));
// // var charmsbutton2 = elements.dockAppList.appendChild(document.createElement("button"));

// if (windowManager.windows && windowManager.windows.browser)
//     elements.dockAppList.appendChild(windowManager.windows.browser.createOpenButton());

// // var settingsThing = bodyCrawler.getS
// // bodyCrawler.settings ? bodyCrawler.settings.onsubmit = function (ev) { ev.preventDefault(); };
// // bodyCrawler.getth.onchange = function () { setThemeOld(this.selectedIndex); };
// reflectionToggle.onchange = function (ev) { toggleReflections(ev.target.checked); }
// blurToggle.onchange = function (ev) { toggleBlur(ev.target.checked); }
// elements.resetAccent.onclick = setAccentColor.bind(this, "");
// elements.border.oninput = elements.border.onchange = function () { setBorderSize(this.value); };
// elements.accent.oninput = elements.accent.onchange = function (ev) { setAccentColor(this.value); };
// elements.color.oninput = elements.color.onchange = function (ev) { setColor(this.value); };
// charmsbutton.onclick = charmsbutton2.onclick = toggleCharms;

// metroAppList.classList.toggle("bottom", true);

// charmsbutton.innerText = "Settings";
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

