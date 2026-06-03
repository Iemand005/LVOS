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
 * Initialize IndexedDB for wallpaper storage.
 */
var wallpaperDB = null;
function initWallpaperDB(onSuccess, onFailure) {
  if (!indexedDB) return;
    if (wallpaperDB) onSuccess(wallpaperDB);
    
    var request = indexedDB.open('LVOSWallpaperDB', 1);
    
    request.onerror = function() {
        console.warn("IndexedDB failed to open:", request.error);
        onFailure(request.error);
    };
    
    request.onsuccess = function() {
        wallpaperDB = request.result;
        console.log("IndexedDB opened successfully");
        onSuccess(wallpaperDB);
    };
    
    request.onupgradeneeded = function(event) {
        var db = event.target.result;
        if (!db.objectStoreNames.contains('wallpapers')) {
            db.createObjectStore('wallpapers', { keyPath: 'id' });
        }
    };
}

/**
 * Store wallpaper image blob to IndexedDB.
 * @param {Blob} blob
 */
function saveWallpaperToCache(blob) {
    if (!(blob instanceof Blob)) {
        console.warn("Invalid blob provided to saveWallpaperToCache");
        return;
    }
    
    initWallpaperDB(function(db) {
        var transaction = db.transaction(['wallpapers'], 'readwrite');
        var store = transaction.objectStore('wallpapers');
        var request = store.put({ id: 'current', blob: blob, timestamp: Date.now() });
        
        request.onsuccess = function() {
            console.log("Wallpaper saved to IndexedDB");
        };
        
        request.onerror = function() {
            console.warn("Failed to save wallpaper to IndexedDB:", request.error);
        };
    }, function(err) {
        console.warn("Failed to access IndexedDB:", err);
    });
}

/**
 * Load wallpaper from IndexedDB cache if available.
 */
function loadWallpaperFromCache() {
    initWallpaperDB(function(db) {
        var transaction = db.transaction(['wallpapers'], 'readonly');
        var store = transaction.objectStore('wallpapers');
        var request = store.get('current');
        
        request.onsuccess = function() {
            var result = request.result;
            if (result && result.blob && typeof applyWallpaperImage === 'function') {
                var objectUrl = URL.createObjectURL(result.blob);
                console.log("Loading cached wallpaper from IndexedDB");
                applyWallpaperImage(objectUrl, null);
            }
        };
        
        request.onerror = function() {
            console.warn("Failed to load wallpaper from IndexedDB:", request.error);
        };
    }, function(err) {
        console.warn("Failed to access IndexedDB:", err);
    });
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
            var objectUrl = e.target.result; 

            try {
                if (typeof applyWallpaperImage === 'function') {
                    applyWallpaperImage(objectUrl, null, function() {
                        console.warn("Failed to apply dropped wallpaper image");
                    });

                    saveWallpaperToCache(file);
                }
            } catch (ex) {
                console.error("Error applying wallpaper:", ex);
                URL.revokeObjectURL(objectUrl);
            }
        };
        reader.readAsDataURL(file); ;
        // Create object URL for display
        // var objectUrl = URL.createObjectURL(file);
        
        break; // Only use the first image
    }
}

var killEvent = function(e) {
            e = e || window.event;
            if (e.preventDefault) e.preventDefault();
            if (e.stopPropagation) e.stopPropagation();
            e.returnValue = false;
            return false;
        };

        window.addEventListener("dragenter", killEvent, false);
        window.addEventListener("dragover", killEvent, false);
        window.addEventListener("drop", killEvent, false);
        document.addEventListener("drop", killEvent, false);

// window.ondrop = document.ondrop = handleWallpaperDrop;

// Load cached wallpaper on initialization
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadWallpaperFromCache);
} else {
    loadWallpaperFromCache();
}