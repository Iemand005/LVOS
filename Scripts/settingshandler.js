// Settings handler
// Lasse Lauwerys © 2024

'use strict';
'use esnext';

function SettingHandler() {
    this.storage = localStorage;
}

SettingHandler.prototype = { get: function (key) { return this.storage.getItem(key); }, set: function (key, value) { this.storage.setItem(key, value); } };

const settings = new SettingHandler();

//const settings = bodyCrawler.settings;
bodyCrawler.settings.onsubmit = function (ev) { ev.preventDefault(); };
const desktop = document.getElementById("desktop");

bodyCrawler.theme.onchange = function (ev) { setTheme(this.selectedIndex); };

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

const charmsbutton = applist.appendChild(document.createElement("button"));
charmsbutton.innerText = "Charms";

const charmsbutton2 = document.getElementById("dockapplist").appendChild(document.createElement("button"));
charmsbutton2.innerText = "Charms"

window.addEventListener("mousedown", toggleCharmsEvent);

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

const elements = {
    color: document.getElementById("color"),
    accent: document.getElementById("accent"),
    resetColor: document.getElementById("resetaccent"),
    resetAccent: document.getElementById("resetaccent"),
    border: document.getElementById("border"),
}

const blurToggle = document.getElementById("blurtoggle");
const reflectionToggle = document.getElementById("reflectiontoggle");
elements.resetAccent.onclick = setAccentColor.bind(this, "");
elements.border.oninput = elements.border.onchange = function () { setBorderSize(this.value); };

blurToggle.onchange = function (ev) { toggleBlur(ev.target.checked); }
reflectionToggle.onchange = function (ev) { toggleReflections(ev.target.checked); }

charmsbutton.onclick = charmsbutton2.onclick = toggleCharms;

const metroAppList = document.getElementById("metroapplist");
metroAppList.classList.toggle("bottom", true);

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
loadSettings();


elements.color.oninput = elements.color.onchange = function (ev) { setColor(this.value); };

elements.accent.oninput = elements.accent.onchange = function (ev) { setAccentColor(this.value); };

window.ondrag = document.ondrag = function(ev){
    ev.preventDefault();
    desktop.style.opacity = 0;
}

window.ondragleave = function(ev){
    ev.preventDefault();
    desktop.style.opacity = null;
}

window.ondrop = document.ondrop = function(ev){
    ev.preventDefault();

    //if (ev.dataTransfer.items) {
    //    // Use DataTransferItemList interface to access the file(s)
    //    [...ev.dataTransfer.items].forEach((item, i) => {
    //      // If dropped items aren't files, reject them
    //      if (item.kind === "file") {
    //        const file = item.getAsFile();
    //        console.log(`… file[${i}].name = ${file.name}`);
    //      }
    //    });
    //  } else {
    //    // Use DataTransfer interface to access the file(s)
    //    [...ev.dataTransfer.files].forEach((file, i) => {
    //      console.log(`… file[${i}].name = ${file.name}`);
    //    });
    //  }
    console.log(ev);
}
// bodyCrawler.charms.onmousedown = function(ev){ev.preventDefault()}
// document.body.addEventListener("mousedown", toggleCharms.bind(this, false));