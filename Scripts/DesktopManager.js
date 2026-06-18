/**
 * @author Lasse Lauwerys
 * @version 1.0.1
 * @copyright Lasse Lauwerys © 2026
 */
'use strict';
'use esnext';

var eventPrevent = function (/** @type {Event} */event) { event.preventDefault(); };

var onLoad = function () {
	var applist = document.getElementById("applist");

	if (applist) {
		applist.addEventListener("submit", eventPrevent, false);
	}

	document.body.ondragover = window.ondragover = function(ev) { 
		ev.preventDefault(); 
		ev.stopPropagation();
		if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'copy';
	}

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./Scripts/sw.js')["then"](function(reg) {
            console.log('Service Worker registered!', reg);
        })["catch"](function(err) {
            console.error('Registration of service worker failed:', err);
        });
    }

    var act = new DragAction();
    // act. 

    var clickOffset = new ClickOffset;

    var tingeling = Array.from(document.getElementsByClassName("folder-content"))[0];

    if (tingeling instanceof HTMLElement) {
        var selector = document.createElement("div");
        tingeling.onmousedown = function(ev) {
            clickOffset.init(ev.clientX, ev.clientY);

            
            translateElement(selector, ev.clientX, ev.clientY);
            selector.className = "selector";
            tingeling.appendChild(selector);
            clickOffset.dragHandler = function(ev) {
                clickOffset.update(ev.clientX - clickOffset.clickX, ev.clientY - clickOffset.clickY);
                var width = clickOffset.position.x, height = clickOffset.position.y;
                selector.style.width = toPixels(width);
                selector.style.height = toPixels(height);
            };
            clickOffset.toggleDragEventHandler(true);
        };
        tingeling.onmouseup = function(ev) {
            selector.remove();
        };
    }

};

window.addEventListener("load", onLoad, false);

var reflecitons = false;

var dock = document.getElementById("dock");
var reflectionr = document.getElementById("reflection");
var reflector = new Reflector(document.getElementById("reflection"));
var applistItems = document.getElementById("dockapplist");

function toggleReflections(force) {
    if (!reflector) return;
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
      var c = windowManager.windows["console"];
      c.open();
      c.maximize();
      break;
    case "F9":
        event.preventDefault();
        this.alert("I'm alive!");
  }
}, false);

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

/**
 * Initialize IndexedDB for wallpaper storage.
 * Skip IndexedDB for file:// scheme (HTAs, local files).
 */
var wallpaperDB = null;
function initWallpaperDB(onSuccess, onFailure) {
    // IndexedDB is only available over http/https, not file:// scheme
    var isFileScheme = window.location.protocol === 'file:';
    if (isFileScheme) {
        console.log("File scheme detected (HTA/local file). Using localStorage only.");
        if (onFailure) onFailure(new Error("IndexedDB not available for file:// scheme"));
        return;
    }
    
    if (!indexedDB) {
        if (onFailure) onFailure(new Error("IndexedDB not supported"));
        return;
    }
    
    if (wallpaperDB) {
        onSuccess(wallpaperDB);
        return;
    }
    
    var request = indexedDB.open('LVOSWallpaperDB', 1);
    
    request.onerror = function() {
        console.warn("IndexedDB failed to open:", request.error);
        if (onFailure) onFailure(request.error);
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
 * Store wallpaper image blob to IndexedDB, with localStorage fallback.
 * @param {Blob} blob
 * @param {string} dataUrl - Optional data URL representation of the blob
 */
function saveWallpaperToCache(blob, dataUrl) {
    if (!(blob instanceof Blob)) {
        console.warn("Invalid blob provided to saveWallpaperToCache");
        return;
    }
    
    // Try IndexedDB first
    initWallpaperDB(function(db) {
        var transaction = db.transaction(['wallpapers'], 'readwrite');
        var store = transaction.objectStore('wallpapers');
        var request = store.put({ id: 'current', blob: blob, timestamp: Date.now() });
        
        request.onsuccess = function() {
            console.log("Wallpaper saved to IndexedDB");
        };
        
        request.onerror = function() {
            console.warn("Failed to save wallpaper to IndexedDB, falling back to localStorage:", request.error);
            // Fall back to localStorage if IndexedDB fails
            if (dataUrl) {
                if (typeof settings !== 'undefined' && settings.set) {
                    try {
                        settings.set('wallpaperImage', dataUrl);
                        console.log("Wallpaper saved to localStorage via settings");
                    } catch (ex) {
                        console.warn("Failed to save to settings, trying direct localStorage:", ex.message);
                        try {
                            window.localStorage.setItem('wallpaperImage', dataUrl);
                            console.log("Wallpaper saved to direct localStorage");
                        } catch (ex2) {
                            console.warn("Failed to save to direct localStorage:", ex2.message);
                        }
                    }
                } else {
                    try {
                        window.localStorage.setItem('wallpaperImage', dataUrl);
                        console.log("Wallpaper saved to direct localStorage");
                    } catch (ex) {
                        console.warn("Failed to save wallpaper to localStorage:", ex.message);
                    }
                }
            }
        };
    }, function(err) {
        // console.warn("Failed to access IndexedDB, falling back to localStorage:", err);
        // Fall back to localStorage if IndexedDB is unavailable
        if (dataUrl) {
            if (typeof settings !== 'undefined' && settings.set) {
                try {
                    settings.set('wallpaperImage', dataUrl);
                    console.log("Wallpaper saved to localStorage via settings");
                } catch (ex) {
                    console.warn("Failed to save to settings, trying direct localStorage:", ex.message);
                    try {
                        window.localStorage.setItem('wallpaperImage', dataUrl);
                        console.log("Wallpaper saved to direct localStorage");
                    } catch (ex2) {
                        console.warn("Failed to save to direct localStorage:", ex2.message);
                    }
                }
            } else {
                try {
                    window.localStorage.setItem('wallpaperImage', dataUrl);
                    console.log("Wallpaper saved to direct localStorage");
                } catch (ex) {
                    console.warn("Failed to save wallpaper to localStorage:", ex.message);
                }
            }
        }
    });
}

/**
 * Load wallpaper from IndexedDB cache or localStorage fallback.
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
            } else {
                // Try localStorage fallback if IndexedDB is empty
                loadWallpaperFromLocalStorage();
            }
        };
        
        request.onerror = function() {
            // console.warn("Failed to load wallpaper from IndexedDB, trying localStorage fallback:", request.error);
            loadWallpaperFromLocalStorage();
        };
    }, function(err) {
        // console.warn("Failed to access IndexedD B, trying localStorage fallback:", err);
        loadWallpaperFromLocalStorage();
    });
}

/**
 * Load wallpaper from localStorage as fallback.
 */
function loadWallpaperFromLocalStorage() {
    console.log("Attempting to load wallpaper from localStorage...");
    console.log("settings defined:", typeof settings !== 'undefined');
    if (typeof settings === 'undefined') {
        console.warn("Settings not available yet, trying direct localStorage access");
        try {
            var cachedWallpaper = window.localStorage.getItem('wallpaperImage');
            if (cachedWallpaper && typeof applyWallpaperImage === 'function') {
                console.log("Loading cached wallpaper from direct localStorage");
                applyWallpaperImage(cachedWallpaper, null);
            } else {
                console.log("No cached wallpaper found in localStorage, or applyWallpaperImage not available");
            }
        } catch (ex) {
            console.warn("Failed to load wallpaper from direct localStorage:", ex.message);
        }
        return;
    }
    
    try {
        var cachedWallpaper = settings.get('wallpaperImage');
        console.log("Retrieved from settings.get():", cachedWallpaper ? 'found' : 'not found');
        if (cachedWallpaper && typeof applyWallpaperImage === 'function') {
            console.log("Loading cached wallpaper from localStorage via settings");
            applyWallpaperImage(cachedWallpaper, null);
        } else {
            console.log("No cached wallpaper found in settings, or applyWallpaperImage not available");
        }
    } catch (ex) {
        console.warn("Failed to load wallpaper from settings localStorage:", ex.message);
        // Try direct localStorage as last resort
        try {
            var cachedWallpaper = window.localStorage.getItem('wallpaperImage');
            if (cachedWallpaper && typeof applyWallpaperImage === 'function') {
                console.log("Loading cached wallpaper from direct localStorage (fallback)");
                applyWallpaperImage(cachedWallpaper);
            }
        } catch (ex2) {
            console.warn("Direct localStorage fallback also failed:", ex2.message);
        }
    }
}

/**
 * Handle dropped files and apply image files as wallpaper.
 * @param {DragEvent} ev
 */
function handleWallpaperDrop(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    if (elements.desktop) elements.desktop.style.opacity = "";

    
    if (!ev.dataTransfer || !ev.dataTransfer.files) return;
    
    var files = ev.dataTransfer.files;
    for (var i = 0; i < files.length; i++) {
        var file = files[i];
        // Only process image files
        if (!file.type.match(/^image\//)) continue;
        
        var reader = new FileReader();
        reader.onload = function(e) {
            var dataUrl = e.target.result;

            try {
                if (typeof applyWallpaperImage === 'function') {
                    applyWallpaperImage(dataUrl, null, function() {
                        console.warn("Failed to apply dropped wallpaper image");
                    });

                    // Save to IndexedDB with localStorage fallback
                    saveWallpaperToCache(file, dataUrl);
                }
            } catch (ex) {
                console.error("Error applying wallpaper:", ex);
            }
        };
        reader.readAsDataURL(file);
        break; // Only use the first image
    }
}


window.ondrop = document.ondrop = handleWallpaperDrop;

// Load cached wallpaper on initialization
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadWallpaperFromCache, false);
} else {
    loadWallpaperFromCache();
}

window.addEventListener('keydown', function(event) {
  if (event.key === 'Shift' || event.keyCode === 16) {
    document.body.classList.add('slow-animations');
  }
}, false);

window.addEventListener('keyup', function(event) {
  if (event.key === 'Shift' || event.keyCode === 16) {
    document.body.classList.remove('slow-animations');
  }
}, false);