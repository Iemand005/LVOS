// Settings handler
// Lasse Lauwerys © 2024

'use strict';
'use esnext';

function SettingsHandler() { // First class declarations, then the functions and as last the initialisation. The defer attribute does give us the ability to call functions before declaration since the file is loaded and parsed, but only gets executed after the DOM and all other files get loaded.
    this.storage = localStorage;
}

SettingsHandler.prototype.get = function (key) { if (this.storage) return this.storage.getItem(key) },
SettingsHandler.prototype.set = function (key, value) { if (this.storage) this.storage.setItem(key, value); }

function setThemeOld(id) {
    if (typeof id === 'undefined') return;
    settings.set("theme", id);
    for(/*let*/var index in windows){
        /*const*/var window = windowManager.windows[index];
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
    /*const*/var clickedElement = document.elementFromPoint(ev.clientX, ev.clientY);
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
    var int = parseInt(hex.replace('#', ''), 16);
    return {r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255};
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
    for(var index in windows){
        var dialog = windowManager.windows[index];
        if (!dialog) continue;
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
    toggleBlur(JSON.parse(a));
}

var settings = new SettingsHandler();

var elements = {
    desktop: document.getElementById("desktop"),
    color: document.getElementById("color"),
    accent: document.getElementById("accent"),
    resetColor: document.getElementById("resetaccent"),
    resetAccent: document.getElementById("resetaccent"),
    border: document.getElementById("border"),
    dockAppList: document.getElementById("dockapplist")
}

var metroAppList = document.getElementById("metroapplist");
var blurToggle = document.getElementById("blurtoggle");
var reflectionToggle = document.getElementById("reflectiontoggle");
var charmsbutton = applist.appendChild(document.createElement("button"));
var charmsbutton2 = elements.dockAppList.appendChild(document.createElement("button"));

if (windowManager.windows.browser) elements.dockAppList.appendChild(windowManager.windows.browser.createOpenButton());

bodyCrawler.settings.onsubmit = function (ev) { ev.preventDefault(); };
bodyCrawler.theme.onchange = function () { setThemeOld(this.selectedIndex); };
reflectionToggle.onchange = function (ev) { toggleReflections(ev.target.checked); }
blurToggle.onchange = function (ev) { toggleBlur(ev.target.checked); }
elements.resetAccent.onclick = setAccentColor.bind(this, "");
elements.border.oninput = elements.border.onchange = function () { setBorderSize(this.value); };
elements.accent.oninput = elements.accent.onchange = function (ev) { setAccentColor(this.value); };
elements.color.oninput = elements.color.onchange = function (ev) { setColor(this.value); };
charmsbutton.onclick = charmsbutton2.onclick = toggleCharms;

metroAppList.classList.toggle("bottom", true);

charmsbutton.innerText = "Settings";
charmsbutton2.innerText = "Settings";

window.addEventListener("mousedown", toggleCharmsEvent);

// Drag and drop wallpaper support: drag and drop an image file onto the desktop to set it as wallpaper.
window.ondrag = document.ondrag = function(ev){
    ev.preventDefault();
    ev.stopPropagation();
    elements.desktop.style.opacity = 0.5;
}

window.ondragleave = document.ondragleave = function(ev){
    ev.preventDefault();
    ev.stopPropagation();
    elements.desktop.style.opacity = null;
}

document.body.ondragover = window.ondragover = function(ev) { 
    ev.preventDefault(); 
    ev.stopPropagation();
    ev.dataTransfer.dropEffect = 'copy';
}

/**
 * Handle dropped files and apply image files as wallpaper.
 * @param {DragEvent} ev
 */
function handleWallpaperDrop(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    elements.desktop.style.opacity = null;
    
    if (!ev.dataTransfer || !ev.dataTransfer.files) return;
    
    var files = ev.dataTransfer.files;
    for (var i = 0; i < files.length; i++) {
        var file = files[i];
        // Only process image files
        if (!file.type.match(/^image\//)) continue;
        
        var reader = new FileReader();
        reader.onload = function(e) {
            try {
                if (typeof applyWallpaperImage === 'function') {
                    applyWallpaperImage(e.target.result, null, function() {
                        console.warn("Failed to apply dropped wallpaper image");
                    });
                }
            } catch (ex) {
                console.error("Error applying wallpaper:", ex);
            }
        };
        reader.onerror = function() {
            console.warn("Failed to read dropped file");
        };
        reader.readAsDataURL(file);
        break; // Only use the first image
    }
}

window.ondrop = document.ondrop = handleWallpaperDrop;

loadSettings();

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