/**
 * @author Lasse Lauwerys
 * @version 1.0.1
 * @copyright Lasse Lauwerys © 2026
 */
'use strict';
'use esnext';

/** @typedef {import(./WindowManager.js).Dialog} Dialog */

var applist = document.getElementById("applist");

applist.addEventListener("submit", function(event){ event.preventDefault(); });

var reflecitons = false;

var windowr = document.getElementById("windows");
var dock = document.getElementById("dock");
var reflectionr = document.getElementById("reflection");
var reflector = new Reflector(document.getElementById("reflection"));
var applistItems = document.getElementById("dockapplist");

function toggleReflections(force) {
    if(force === null) reflecitons = !reflecitons;
    else reflecitons = Boolean(force);
    if(reflecitons) windowManager.forEachWindow(function(dialog) { reflector.reflect(dialog.target); });
    else if (typeof reflector.observer !== 'undefined') reflector.observer.disconnect();
}

window.addEventListener('keydown', function(event) {
  switch (event.key) {
    case "F11":
      event.preventDefault();
      console.log("F11 captured! Custom action goes here.");
      
      document.documentElement.requestFullscreen();
      break;
    case "F10":
      event.preventDefault();
      /** @type {Dialog} */
      var c = windows["console"];
      c.open();
      c.maximize();
      break;
  }
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('./Scripts/sw.js')
      .then(function(reg) { console.log('Service Worker geregistreerd!', reg)})
      .catch(function(err) { console.error('Registratie mislukt:', err) });
  });
}

function setTheme(theme) {
  document.body.classList.add(theme);
}


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