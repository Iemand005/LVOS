// Settings handler
// Lasse Lauwerys © 2024

'use strict';
'use esnext';

function SettingHandler() { // First class declarations, then the functions and as last the initialisation. The defer attribute does give us the ability to call functions before declaration since the file is loaded and parsed, but only gets executed after the DOM and all other files get loaded.
    this.storage = localStorage;
}

SettingHandler.prototype = { get: function (key) { return this.storage.getItem(key); }, set: function (key, value) { this.storage.setItem(key, value); } };

function setTheme(id) {
    if (typeof id === 'undefined') return;
    settings.set("theme", id);
    for(let index in windows){
        const window = windows[index];
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
    const clickedElement = document.elementFromPoint(ev.clientX, ev.clientY);
    if (!isCharmsOpen() || clickedElement == charmsbutton || clickedElement == charmsbutton2) return;

    if(!(clickedElement == bodyCrawler.charms || bodyCrawler.charms.contains(clickedElement))) {
        //if(clickedElement == charmsbutton || clickedElement == charmsbutton2) toggleCharms();
    //else 
        toggleCharms(false);
    }
}

function setBorderSize(size) {
    settings.set("borderSize", size);
    for (let index in windows) windows[index].borderSize = size;
}

function hexToRGB(hex) {
    if (typeof hex === 'undefined') return;
    const int = parseInt(hex.replace('#', ''), 16);
    return {r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255};
}

function isColorDark(color) {
    if (typeof color === 'undefined') return;
    const rgb = hexToRGB(color);
    return 0.2126*rgb.r + 0.7152*rgb.g + 0.0722*rgb.b < 128;
}

function setColor(color){
    // const y = 0.2126*rgb.r + 0.7152*rgb.g + 0.0722*rgb.b;
    // const c = y < 128 ? "black" : "white";
    if (typeof color === 'undefined') return;
    settings.set("color", elements.color.value = color);
    
    const isWhite = isColorDark(color);
    for(let index in windows){
        const content = windows[index].target.getElementsByTagName("content")[0];
        content.style.backgroundColor = color;
        content.style.color = isWhite?"white":"black";
    }
}

function setAccentColor(color) {
    settings.set("accentColor", elements.accent.value = color);
    const isWhite = isColorDark(color);
    const metroStyle = document.getElementById("metro").style, charmStyle = document.getElementById("charms").style;
    metroStyle.backgroundColor = charmStyle.backgroundColor = color;
    metroStyle.color = charmStyle.color = isWhite?"white":"black";
    // document.getElementById("metro").style.backgroundColor = document.getElementById("charms").style.backgroundColor = color;;

}

function loadSettings() {
    setColor(settings.get("color"));
    setAccentColor(settings.get("accentColor"));
    setTheme(settings.get("theme"));
    getBorderSize(settings.get("borderSize"));
}

const settings = new SettingHandler();

const elements = {
    desktop: document.getElementById("desktop"),
    color: document.getElementById("color"),
    accent: document.getElementById("accent"),
    resetColor: document.getElementById("resetaccent"),
    resetAccent: document.getElementById("resetaccent"),
    border: document.getElementById("border"),
    dockAppList: document.getElementById("dockapplist");
}

const metroAppList = document.getElementById("metroapplist");
const blurToggle = document.getElementById("blurtoggle");
const reflectionToggle = document.getElementById("reflectiontoggle");
// const dockAppListElement = 
const charmsbutton = applist.appendChild(document.createElement("button"));
const charmsbutton2 = elements.dockAppList.appendChild(document.createElement("button"));

bodyCrawler.settings.onsubmit = function (ev) { ev.preventDefault(); };
bodyCrawler.theme.onchange = function () { setTheme(this.selectedIndex); };
reflectionToggle.onchange = function (ev) { toggleReflections(ev.target.checked); }
blurToggle.onchange = function (ev) { toggleBlur(ev.target.checked); }
elements.resetAccent.onclick = setAccentColor.bind(this, "");
elements.border.oninput = elements.border.onchange = function () { setBorderSize(this.value); };
elements.accent.oninput = elements.accent.onchange = function (ev) { setAccentColor(this.value); };
elements.color.oninput = elements.color.onchange = function (ev) { setColor(this.value); };
charmsbutton.onclick = charmsbutton2.onclick = toggleCharms;

metroAppList.classList.toggle("bottom", true);

charmsbutton.innerText = "Charms";
charmsbutton2.innerText = "Charms"

window.addEventListener("mousedown", toggleCharmsEvent);

// This isn't finished yet, I am still working on making dragging and dropping files work properly so we can drag and drop a photo to have it immediately set as wallpaper! While this is work in progress you can set the wallpaper from the charms bar.
window.ondrag = document.ondrag = function(ev){
    ev.preventDefault();
    elements.desktop.style.opacity = 0;
}

window.ondragleave = function(ev){
    ev.preventDefault();
    elements.desktop.style.opacity = null;
}

window.ondrop = document.ondrop = function(ev){
    ev.preventDefault();
    console.log(ev);
}

loadSettings();
