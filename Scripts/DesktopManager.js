/**
 * @author Lasse Lauwerys
 * @version 1.0.1
 * @copyright Lasse Lauwerys © 2026
 */
'use strict';
'use esnext';

function changeTitlebarColor(newColor) {
	var metaTag = document.querySelector('meta[name="theme-color"]');

	if (!metaTag) {
		metaTag = document.createElement('meta');
		metaTag.setAttribute('name', 'theme-color');
		document.head.appendChild(metaTag);
	}

	metaTag.setAttribute('content', newColor);
}

function vibrate() {
	navigator.vibrate(500);
}

function stopVibrations() {
  navigator.vibrate(0);
}

var eventPrevent = function (/** @type {Event} */event) { event.preventDefault(); };

var onLoad = function () {
	var applist = document.getElementById("applist");

	if (applist) {
		applist.addEventListener("submit", eventPrevent, false);
	}

	var appButtons = document.getElementById("dockapplist");

	if (appButtons) {
		var startButton = document.createElement("button")
		startButton.innerHTML = "Start";
        startButton.id = "start-button";
		startButton.addEventListener("click", function () {
			launchpad.open();
		}, false);

		appButtons.appendChild(startButton);

		var clock = document.createElement("time");
		clock.id = "clock";

		function updateClock() {
			clock.innerHTML = new Date().toLocaleTimeString();
		}

		updateClock();
		setInterval(updateClock, 1000);

		appButtons.appendChild(clock);
	}

	document.body.ondragover = window.ondragover = function(ev) { 
		ev.preventDefault(); 
		ev.stopPropagation();
		if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'copy';
	}

	if ('serviceWorker' in navigator) navigator.serviceWorker.register('./Scripts/sw.js')["then"](function(reg) {
		console.log('Service Worker registered!', reg);
	})["catch"](function(err) {
		console.error('Registration of service worker failed:', err);
	});

	var clickOffset = new ClickOffset;

	var tingeling = Array.from(document.getElementsByClassName("folder-content"))[0];

		if (tingeling instanceof HTMLElement) {
			var selector = document.createElement("div");
		clickOffset.dragHandler = function(ev) {
			clickOffset.update(ev.clientX - clickOffset.clickX, ev.clientY - clickOffset.clickY);
			var width = clickOffset.position.x, height = clickOffset.position.y;

			translateElement(selector, width < 0 ? ev.clientX : clickOffset.clickX, height < 0 ? ev.clientY : clickOffset.clickY);
			
			selector.style.width = toPixels(Math.abs(width));
			selector.style.height = toPixels(Math.abs(height));
		};
		
		// if (supportsPointer)
			tingeling.addEventListener(supportsPointer?"pointerdown":"mousedown", function(ev) {
			clickOffset.init(ev.clientX, ev.clientY);

			var width = clickOffset.position.x, height = clickOffset.position.y;
			translateElement(selector, width < 0 ? ev.clientX : clickOffset.clickX, height < 0 ? ev.clientY : clickOffset.clickY);
			
			selector.style.width = toPixels(Math.abs(width));
			selector.style.height = toPixels(Math.abs(height));
			
			// translateElement(selector, ev.clientX, ev.clientY);
			selector.className = "selector";
			tingeling.appendChild(selector);

			clickOffset.toggleDragEventHandler(true);
			// document.body.hasPointerCapture
	}, false);

		tingeling.addEventListener(supportsPointer?"pointerdown":"mousedown",function() {
			selector.remove();
		}, false);

		window.addEventListener(supportsPointer?"pointerup":"mouseup", function(ev) { selector.remove(); }, false);
	}

    
    launchpad.open();
};

window.addEventListener("load", onLoad, false);

document.addEventListener("contextmenu", function(e) {
    e.preventDefault();

    console.log("Open contex tp ples");
}, false);

var reflecitons = false;

var dock = document.getElementById("dock");
var reflectionr = document.getElementById("reflection");
var reflector = reflectionr ? new Reflector(reflectionr) : null;
var applistItems = document.getElementById("dockapplist");

/** @param {boolean} force  */
function toggleReflections(force) {
    if (!reflector) return;
    if(force == null) reflecitons = !reflecitons;
    else reflecitons = Boolean(force);
    if(reflecitons) windowManager.forEachWindow(function(dialog) { if (dialog.target && reflector) reflector.reflect(dialog.target); });
    else if (typeof reflector.observer != 'undefined') reflector.observer.disconnect();
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
    case "F8":
        event.preventDefault();
        downloadSettings();
        break;
  }
}, false);

function DesktopManager() {

	/** @type {HTMLImageElement | null} */
	this.wallpaperImage = null;
}

/** @param {string} theme */
function setTheme(theme) { document.body.classList.add(theme); }
/** @param {string} theme */
function hasTheme(theme) { return document.body.classList.contains(theme); }
/** @param {string} theme */
DesktopManager.removeTheme = function(theme) { document.body.classList.remove(theme); }


/**
 * @param {string} url
 * @param {string} [blurredUrl]
 * @param {()=>void | null} [onError]
 */
DesktopManager.prototype.applyWallpaperImage = function(url, blurredUrl, onError) {
    this.wallpaperImage = document.createElement("img");
    this.wallpaperImage.onerror = function () {
        console.warn("Failed to load wallpaper image!");
		if (onError) onError();
    };

    var self = this;

    var loadHandler = function() {
        var wallpaper = getWallpaper();
        if (!wallpaper || !self.wallpaperImage) return;
        while (wallpaper.firstChild) wallpaper.removeChild(wallpaper.firstChild);
        // wallpaper.setAttribute("data-wallpaper-src", url);
        if (typeof blurredUrl == "string") wallpaper.setAttribute("data-blurred-src", blurredUrl);
        else wallpaper.removeAttribute("data-blurred-src");
    
        wallpaper.classList.toggle("legacy-wallpaper", !supportsObjectFit);
        wallpaper.style.backgroundImage = "";
        wallpaper.appendChild(self.wallpaperImage);
    };

	this.wallpaperImage.onload = loadHandler;

    if (supportsObjectFit) {
        this.wallpaperImage.src = url;
        this.wallpaperImage.className = "wallpaper-image";
    } else {
        this.wallpaperImage.className = "wallpaper-image legacy-wallpaper-image";
        this.wallpaperImage.removeAttribute("src");
        this.wallpaperImage.style.backgroundImage = "url('" + url.replace(/'/g, "\\'") + "')";
       	loadHandler();
    }
    if (blurredUrl) this.wallpaperImage.setAttribute("blurred-src", blurredUrl);

}

// DesktopManager.hasTheme

window.desktopManager = new DesktopManager();

window.desktopManager.applyWallpaperImage(
  "file:///C:/Users/Lasse/Downloads/daniil-silantev-Rl7SZ19fgRQ-unsplash.jpg",
  "file:///C:/Users/Lasse/Downloads/fox-blur.jpg"
);


// Drag and drop wallpaper support: drag and drop an image file onto the desktop to set it as wallpaper.
window.ondrag = document.ondrag = function(ev){
    ev.preventDefault();
    ev.stopPropagation();
    if (elements.desktop) elements.desktop.style.opacity = "0.5";
}

window.ondragleave = document.ondragleave = function(ev){
    ev.preventDefault();
    ev.stopPropagation();
    if (elements.desktop) elements.desktop.style.opacity = "";
}

/**
 * Initialize IndexedDB for wallpaper storage.
 * Skip IndexedDB for file:// scheme (HTAs, local files).
 */
var wallpaperDB = null;
function initWallpaperDB(onSuccess, onFailure) {
    // IndexedDB is only available over http/https, not file:// scheme
    var isFileScheme = window.location.protocol == 'file:';
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
        if (!event.target) return;
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
    initWallpaperDB(function (db) {
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
                if (typeof settings != 'undefined' && settings.set) {
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
    }, function (err) {
        // console.warn("Failed to access IndexedDB, falling back to localStorage:", err);
        // Fall back to localStorage if IndexedDB is unavailable
        if (dataUrl) {
            if (typeof settings != 'undefined' && settings.set) {
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
            if (result && result.blob && window.desktopManager) {
                var objectUrl = URL.createObjectURL(result.blob);
                console.log("Loading cached wallpaper from IndexedDB");
                window.desktopManager.applyWallpaperImage(objectUrl);
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
    console.log("settings defined:", typeof settings != 'undefined');
    if (typeof settings == 'undefined') {
        console.warn("Settings not available yet, trying direct localStorage access");
        try {
            var cachedWallpaper = window.localStorage.getItem('wallpaperImage');
            if (cachedWallpaper && window.desktopManager) {
                console.log("Loading cached wallpaper from direct localStorage");
                window.desktopManager.applyWallpaperImage(cachedWallpaper);
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
        if (cachedWallpaper && window.desktopManager) {
            console.log("Loading cached wallpaper from localStorage via settings");
            window.desktopManager.applyWallpaperImage(cachedWallpaper);
        } else {
            console.log("No cached wallpaper found in settings, or applyWallpaperImage not available");
        }
    } catch (ex) {
        console.warn("Failed to load wallpaper from settings localStorage:", ex.message);
        // Try direct localStorage as last resort
        try {
            var cachedWallpaper = window.localStorage.getItem('wallpaperImage');
            if (cachedWallpaper && window.desktopManager) {
                console.log("Loading cached wallpaper from direct localStorage (fallback)");
                window.desktopManager.applyWallpaperImage(cachedWallpaper);
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
            if (!e.target) return;
            var dataUrl = e.target.result;
			if (!(typeof dataUrl === "string")) return;

            try {
                if (window.desktopManager) {
                    window.desktopManager.applyWallpaperImage(dataUrl, undefined, function() {
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

/**
 * @param {HTMLElement} el - the element to pop out
 * @param {(pipWindow:Window)=>void} callback - the element to pop out
 */
DesktopManager.toggleElementPip = function(el, callback) {
  if (!('documentPictureInPicture' in window) || !window.documentPictureInPicture) {
    console.warn('Document Picture-in-Picture not supported in this browser.');
    return null;
  }

  // If already in PiP, close it (this triggers pagehide -> restores element)
  var existing = window.documentPictureInPicture.window;
  if (existing) {
    existing.close();
    return null;
  }

  	var rect = el.getBoundingClientRect();
	var width = Math.round(rect.width) || 400;
	var height = Math.round(rect.height) || 300;

	window.documentPictureInPicture.requestWindow({ width:width, height:height }).then(function(pipWindow) {
		var originalParent = el.parentNode;
		var originalNextSibling = el.nextSibling;

		pipWindow.document.body.style.margin = '0';
		pipWindow.document.body.appendChild(el);

		pipWindow.addEventListener('pagehide', function () {
			if (!originalParent) return;
			if (originalNextSibling) originalParent.insertBefore(el, originalNextSibling);
			else originalParent.appendChild(el);
		}, { once: true });

		callback(pipWindow);
	});
}


window.ondrop = document.ondrop = handleWallpaperDrop;

// Load cached wallpaper on initialization
if (document.readyState == 'loading') {
    document.addEventListener('DOMContentLoaded', loadWallpaperFromCache, false);
} else {
    loadWallpaperFromCache();
}

window.addEventListener('keydown', function(event) {
  if (event.key == 'Shift' || event.keyCode == 16) {
    document.body.classList.add('slow-animations');
  }
}, false);

window.addEventListener('keyup', function(event) {
  if (event.key == 'Shift' || event.keyCode == 16) {
    document.body.classList.remove('slow-animations');
  }
}, false);
