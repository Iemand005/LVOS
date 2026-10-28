/**
 * @author Lasse Lauwerys
 * @version 1.0.1
 * @copyright Lasse Lauwerys © 2026
 */
"use strict";

/** @type {Launchpad?} */
var launchpad = typeof Launchpad !== "undefined" ? new Launchpad : null;

function loadScript(url, callback) {
  var script = document.createElement("script");
  script.src = url;

  script.onload = callback;

  document.head.appendChild(script);
}

function init() {
	// The window manager must be initialized even on pages without a launchpad:
	// initializeDialogs() registers the document/window pointerup listener that ends
	// a drag, so skipping it leaves every window stuck to the cursor.
	if (typeof windowManager !== "undefined" && "windowManager" in window) {
		if (launchpad) windowManager.forEachWindow(function(dialog) {
			if (dialog.application) launchpad.addApp(dialog);
		});
		if (!isBlink) DesktopManager.removeTheme("glass");
		windowManager.initializeDialogs();

		LVMessenger.receive(messageReceived);
	}
	// return;
	var launchpadElement = document.getElementById("launchpad");

	if (launchpad && launchpadElement) {
		launchpad.init(launchpadElement);

		if (typeof appManager !== "undefined") {
			appManager.forEachApp(launchpad.addApp.bind(launchpad));
			// launchpad.open();
			appManager.reloadWallpaper();
		}
	}



	if (location.protocol === "file:") try {
		/**@type {NodeListOf<HTMLScriptElement>}*/
		var scripts = document.querySelectorAll("script[type=\"module\"]");
		scripts.forEach(function (/**@type {HTMLScriptElement}*/s) {
			var replacement = document.createElement("script");
			replacement.src = s.src;
			try {

				s.replaceWith(replacement);
			} catch(ex) {}
		});
	} catch(ex) {}

	window.metaThemeColor = document.querySelector("meta[name=\"theme-color\"]") || undefined;
	if (window.__LVMessenger)
		window.__LVMessenger.accent = window.metaThemeColor;
}

function ready(fn) {
	if (document.readyState === "complete" || document.readyState === "interactive") {
		setTimeout(fn, 0);
		return;
	}
	window.addEventListener("DOMContentLoaded", fn, false);
}
ready(init);

var eventPrevent = function (/** @type {Event} */event) { event.preventDefault(); };

var onLoad = function () {

	var desktop = document.getElementById("desktop");
	if (desktop) desktop.onmousedown = function () {
		DesktopManager.toggleCharms(false);
        if (launchpad) launchpad.close();
        contextMenu.close();
	};

    // var wallpaper = window.windows["wallpaper"];
    // if (wallpaper instanceof HTMLIFrameElement) {
    //     wallpaper.onerror = function () {
    //         if (wallpaper instanceof HTMLIFrameElement) wallpaper.src = "https://iemand005.github.io/FrostedColours/";
    //     }
    //     wallpaper.src = wallpaper.src
    // }

	var applist = document.getElementById("applist");

	if (applist)
		applist.onsubmit = eventPrevent;

	var appButtons = document.getElementById("dockapplist");

	if (appButtons) {
		var startButton = document.createElement("button");
		startButton.innerHTML = "Start";
        startButton.id = "start-button";
		startButton.addEventListener("click", function () {
			if (launchpad) launchpad.open();
		}, false);

		appButtons.appendChild(startButton);

        // /** @type {HTMLTimeElement | OdometerTime} */
        var clock = document.createElement("time", { is: "odometer-time" });
		clock.id = "clock";

		var updateClock = function() {
            var date = new Date();
            clock.dateTime = date.toISOString();
            if (!("tracks" in clock))
                clock.innerHTML = date.toLocaleTimeString();
            setTimeout(updateClock, 1000 - (Date.now() % 1000));
		};

		updateClock();

		appButtons.appendChild(clock);
	}

	document.body.ondragover = window.ondragover = function(ev) {
		ev.preventDefault();
		ev.stopPropagation();
		if (ev.dataTransfer) ev.dataTransfer.dropEffect = "copy";
	};

    document.body.ondrop = function(ev) {
		ev.preventDefault();
		ev.stopPropagation();
		setDesktopDragOpacity("");
		if (!ev.dataTransfer) return;

        ev.dataTransfer.dropEffect = "copy";


        var dt = ev.dataTransfer;
        if (!dt) return;

        dt.dropEffect = "copy";

        var json = "";
        var plain = "";
        var uriList = "";
        var html = "";

        try {
            json = dt.getData("application/json") || "";
            plain = dt.getData("text/plain") || "";
            uriList = dt.getData("text/uri-list") || "";
            html = dt.getData("text/html") || "";
        } catch (exception) { }

        try { if (!plain) plain = dt.getData("Text") || ""; } catch (exception) { }
        try { if (!uriList) uriList = dt.getData("URL") || ""; } catch (exception) { }

        var droppedUrl = "";
        if (uriList) {
            var line = uriList.split(/\r?\n/).find(function (entry) {
                entry = entry.trim();
                return entry && entry.charAt(0) !== "#";
            });
            droppedUrl = line ? line.trim() : "";
        }

        if (!json && plain && /^[[{]/.test(plain.trim())) json = plain.trim();

        /** @type {DialogDropState | null} */
        var data = null;

        // If text/html carries a hidden JSON blob, prefer it because text/plain may be overridden.
        if (html) {
            try {
                var newDoc = new DOMParser().parseFromString(html, "text/html");
                var trimmed = ((newDoc.body && newDoc.body.textContent) || html).trim();
                if (trimmed) data = JSON.parse(trimmed);
            } catch (exception) {
                data = null;
            }
        }

        if (!data && json) {
            try { data = JSON.parse(json); } catch (exception) { data = null; }
        }

        if (data && data.app && window.windowManager) {
            window.windowManager.dropApplication(data.app, ev.clientX, ev.clientY, data.offset, data.state);
            return;
        }

        // If it's not our internal drop, treat the dropped URL as an app to open.
        if (!droppedUrl && plain && !/^\{|\[/.test(plain.trim())) {
            droppedUrl = plain.trim();
        }

        if (!droppedUrl) return;

        var url;
        try { url = new URL(droppedUrl, location.href).href; } catch (exception) { return; }

        var existing = null;
        // Try to find an app with this src (or distSrc)
        for (var id in window.appManager.apps) {
            if (window.appManager.apps.hasOwnProperty(id)) {
                var a = window.appManager.apps[id];
                if (a && (a.src === url || a.distSrc === url)) { existing = a; break; }
            }
        }
        if (existing) {
            window.windowManager.dropApplication(existing, ev.clientX, ev.clientY);
            return;
        }

        // Create a basic app for the dropped URL and open it.
        var newApp = window.appManager.createApp(url, url, "dropped." + Date.now());
        window.appManager.addApp(newApp);
        window.windowManager.dropApplication(newApp, ev.clientX, ev.clientY);
	};

	if ("serviceWorker" in navigator) navigator.serviceWorker.register("./Scripts/sw.js")["then"](function(reg) {
		console.log("Service Worker registered!", reg);
	})["catch"](function(err) {
		console.warn("Registration of service worker failed:", err);
	});

    if (typeof ClickOffset === "undefined") return;

	var clickOffset = new ClickOffset;

	var tingeling = Array.from(document.getElementsByClassName("folder-content"))[0];

		if (tingeling instanceof HTMLElement) {
			var selector = document.createElement("div");
		clickOffset.dragHandler = function(ev) {
			clickOffset.update(ev.clientX - clickOffset.clickX, ev.clientY - clickOffset.clickY);
			var width = clickOffset.position.x, height = clickOffset.position.y;

			Helpers.translateElement(selector, width < 0 ? ev.clientX : clickOffset.clickX, height < 0 ? ev.clientY : clickOffset.clickY);

			selector.style.width = Helpers.toPixels(Math.abs(width));
			selector.style.height = Helpers.toPixels(Math.abs(height));
		};

		// if (supportsPointer)
        tingeling.addEventListener(supportsPointer?"pointerdown":"mousedown", function(ev) {
			clickOffset.init(ev.clientX, ev.clientY);

			var width = clickOffset.position.x, height = clickOffset.position.y;
			Helpers.translateElement(selector, width < 0 ? ev.clientX : clickOffset.clickX, height < 0 ? ev.clientY : clickOffset.clickY);

			selector.style.width = Helpers.toPixels(Math.abs(width));
			selector.style.height = Helpers.toPixels(Math.abs(height));

			// translateElement(selector, ev.clientX, ev.clientY);
			selector.className = "selector";
			if (tingeling) tingeling.appendChild(selector);

			clickOffset.toggleDragEventHandler(true);
			// document.body.hasPointerCapture
		}, false);

		var stopIt = function() {
			clickOffset.toggleDragEventHandler(false);

			if (selector.parentNode) selector.parentNode.removeChild(selector);
		};

		window.addEventListener(supportsPointer ? "pointerup" : "mouseup", stopIt, false);
	}

    document.onselectstart = function (event) {
        return !!(event && event.ctrlKey);
    };

    if (window.desktopManager) window.desktopManager.init();
};

function createDesktop() {
    var windowSection = document.createElement("section");
    windowSection.className = "window-section";

    var wallpaper = document.getElementById("wallpaper").cloneNode(true);
    windowSection.appendChild(wallpaper);

    var dockArea = document.getElementById("dock-area").cloneNode(true);
    windowSection.appendChild(dockArea);

    return windowSection;
}

/**
 * @param {string} [name] @param {HTMLElement} [desktopElement]
 * @param desktopElement
 */
function Desktop(name, desktopElement) {
    this.name = name;

    this.target = desktopElement || createDesktop();
}

/** @param {Dialog} dialog */
Desktop.prototype.insertWindow = function(dialog) {
    dialog.setParentElement(this.target);
};

window.addEventListener("load", onLoad, false);

function ContextMenu() {
    this.element = document.getElementById("context-menu");
}
/**
 * @param {number} x
 * @param {number} y
 */
ContextMenu.prototype.open = function(x, y) {
    if (!this.element) return;
    // translateElement(this.element, x, y);
    this.element.style.left = Helpers.toPixels(x);
    this.element.style.top = Helpers.toPixels(y);
    this.element.classList.add("open");
};

ContextMenu.prototype.close = function() {
    if (!this.element) return;
    this.element.classList.remove("open");
};

var contextMenu = new ContextMenu;


document.addEventListener("contextmenu", function(e) {
    e.preventDefault();
    contextMenu.open(e.clientX, e.clientY);
}, false);

var dock = document.getElementById("dock");

window.addEventListener("keydown", function(event) {
  switch (event.key) {
    case "F11":
      event.preventDefault();

      void document.documentElement.requestFullscreen();
      break;
    case "F10":
      event.preventDefault();
      var c = windowManager.windows["console"];
	  if (c) {
		  c.open();
		  c.maximize();
	  }
      break;
    case "F9":
        event.preventDefault();
        this.alert("I'm alive!");
		break;
    case "F8":
        event.preventDefault();
        downloadSettings();
        break;
  }
}, false);

function DesktopManager() {

	/** @type {HTMLImageElement | null} */
	this.wallpaperImage = null;
    /** @type {Desktop[]} */
    this.desktops = [];

    /** @type {TabScroller | null} */
    this.scrollTabs = null;

    /** @type {Node | null} */
    this.desktopParent = null;
    /** @type {Node | null} */
    this.desktopNextSibling = null;

	/** @type {(() => void) | null} */
	this._endAnim = null;
}

Object.defineProperty(DesktopManager.prototype, "isExposé", {
    get: function() { return Boolean(document.scrollingElement && document.scrollingElement.scrollTop); }
});

/**
 * @param {number} x
 * @param {number} y
 * @returns {number} The index of the desktop whose area contains the point, or -1.
 */
DesktopManager.prototype.getDesktopIndexAt = function(x, y) {
    for (var i = 0; i < this.desktops.length; i++) {
        var desktop = this.desktops[i];
		if (!desktop) continue;
        var element = desktop.target;
        var rect = element.getBoundingClientRect();
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return i;
    }
    return -1;
};

DesktopManager.prototype.init = function() {
	if (flags.bootAnimation) this.playBootAnimation();

    var windowSection = document.getElementById("window-section");
    if (windowSection) {
        this.desktopParent = windowSection.parentNode;
        this.desktopNextSibling = windowSection.nextSibling;
    }

    this.setExposéEnabled(!(typeof flags !== "undefined" && flags.exposeAndDesktops === false));


	initApps();

	if (document.documentMode === 9) {
		var script = document.createElement("script");
		script.src = "./Scripts/Animation.js";
		document.getElementsByTagName("head")[0].appendChild(script);
	}


	setTimeout(this.finishBootAnimationEarly, 200);
};

Object.defineProperty(DesktopManager.prototype, "overlay", {
	get: function() { return document.getElementById("overlay"); }
});

/**
 * @param {boolean} visible
 * @param {boolean} [animate]
 * @param {string} [extraClass]
 */
DesktopManager.prototype.toggleOverlayVisible = function(visible, animate, extraClass) {
	var overlay = this.overlay;
	if (!overlay) return;
	if (visible) overlay.classList.add("open");
	else overlay.classList.remove("open");

	if (animate !== false) overlay.classList.add("animating");
	else overlay.classList.remove("animating");

	if (extraClass) overlay.classList.add(extraClass);
};

DesktopManager.prototype.resetOverlay = function() {
	var overlay = this.overlay;
	if (!overlay) return;
	overlay.className = "";
};

/** @typedef {"zoom" | "flip"} AnimationName */

/** @param {AnimationName} [name] */
DesktopManager.prototype.playBootAnimation = function(name) {
	this.toggleOverlayVisible(true, false, name || "zoom");
	var overlay = this.overlay;
	if (!overlay) return;
	var logo = document.getElementById("boot-logo");
	// logo.onanimationend
	if (!logo) return;
	var log = logo;

	log.className = "";

	var self = this;
	this._endAnim = function() {
		self.toggleOverlayVisible(false);

		Helpers.animateElement(log, function() {
			log.classList.add("end");
		});
	};

	Helpers.animateElement(log, function() {
		log.classList.add("neutral");

	}, "scale", function() {
		log.classList.add("neutral-big");
		if (this._endAnim) setTimeout(this._endAnim, 500);
	}, this);
};

DesktopManager.prototype.finishBootAnimationEarly = function() {
	if (this._endAnim) this._endAnim();
};

DesktopManager.prototype.isExposéSupported = function() {
    return "TabScroller" in window && !(document.documentMode && document.documentMode < 10);
};

/** @param {boolean} enabled */
DesktopManager.prototype.setExposéEnabled = function(enabled) {
    if (enabled) this.enableExposé();
    else this.disableExposé();
};

DesktopManager.prototype.enableExposé = function() {
    if (this.scrollTabs || !this.isExposéSupported()) return;

    var windowSection = document.getElementById("window-section");
    if (!windowSection) return;

    if (!this.desktopParent) {
        this.desktopParent = windowSection.parentNode;
        this.desktopNextSibling = windowSection.nextSibling;
    }

    document.body.classList.add("exposé");

	var main = document.getElementById("desktop-area");
    this.scrollTabs = main ? new TabScroller(main) : null;
    this.addDesktop("Main", windowSection);
    this.addDesktop();
    this.addDesktop();
};

DesktopManager.prototype.disableExposé = function() {
    document.body.classList.remove("exposé");

    var windowSection = document.getElementById("window-section");
    var parent = this.desktopParent || document.getElementById("desktop-area");
    if (windowSection && parent) {
        if (this.desktopNextSibling && this.desktopNextSibling.parentNode === parent)
            parent.insertBefore(windowSection, this.desktopNextSibling);
        else parent.appendChild(windowSection);
    }

    if (this.scrollTabs && this.scrollTabs.container && this.scrollTabs.container.parentNode)
        this.scrollTabs.container.parentNode.removeChild(this.scrollTabs.container);

    this.scrollTabs = null;
    this.desktops = [];
    this.gapDesktop = null;
};

/**
 * @param {string} [name] @param {HTMLElement} [desktopElement]
 * @param desktopElement
 */
DesktopManager.prototype.addDesktop = function(name, desktopElement) {
    if (!this.scrollTabs) return;
    var desktop = new Desktop(name || "Desktop " + (this.desktops.length + 1), desktopElement);
    this.scrollTabs.addTab(desktop.target);
    this.desktops.push(desktop);

    this.addOrMoveDesktopGap();
};

DesktopManager.prototype.addOrMoveDesktopGap = function() {
    if (!this.scrollTabs) return;
    if (!this.gapDesktop) {
        this.gapDesktop = document.createElement("div");
        this.gapDesktop.className = "tab-page";
    }
    this.scrollTabs.element.appendChild(this.gapDesktop);
};

/** @param {string} theme */
function setTheme(theme) {
	ensureClassList(document.body);
    document.body.classList.add(theme);
    window.windowManager.synchronizeStates();
}
/** @param {string} theme */
DesktopManager.removeTheme = function(theme) {
	ensureClassList(document.body);
	document.body.classList.remove(theme);
};
/** @param {boolean} [force] */
DesktopManager.toggleCharms = function(force){
	var charms = document.getElementById("charms");
    if (!charms) return;
    if (charms.classList.toggle.length) return charms.classList.toggle("open", force);
    // if (charms.classList.contains("open")) charms.classList.remove("open")
    if (force) charms.classList.add("open");
    else charms.classList.remove("open");
    return force === true;
};

DesktopManager.getWallpaper = function () {
	return document.getElementById("wallpaper");
};

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
        var wallpaper = DesktopManager.getWallpaper();
        if (!wallpaper || !self.wallpaperImage) return;
        while (wallpaper.firstChild) wallpaper.removeChild(wallpaper.firstChild);
        // wallpaper.setAttribute("data-wallpaper-src", url);
        if (typeof blurredUrl === "string") wallpaper.setAttribute("data-blurred-src", blurredUrl);
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

};

/** Recreate the wallpaper frame that the registered wallpaper apps render in. */
DesktopManager.prototype.ensureWallpaperFrame = function() {
	var wallpaper = DesktopManager.getWallpaper();
	if (!wallpaper) return null;
	var frame = document.getElementById("wallpaper-frame");
	if (frame instanceof HTMLIFrameElement) return frame;
	frame = document.createElement("iframe");
	frame.id = "wallpaper-frame";
	frame.frameBorder = "0";
	wallpaper.appendChild(frame);
	return frame;
};

/** Remove whatever is currently shown (image or frame) so switching is clean. */
DesktopManager.prototype.clearWallpaperContent = function() {
	var wallpaper = DesktopManager.getWallpaper();
	if (!wallpaper) return;
	this.wallpaperImage = null;
	while (wallpaper.firstChild) wallpaper.removeChild(wallpaper.firstChild);
	wallpaper.classList.remove("legacy-wallpaper");
	wallpaper.classList.remove("legacy-wallpaper-image");
	wallpaper.removeAttribute("data-blurred-src");
	wallpaper.style.backgroundImage = "";
};

/**
 * Apply one of the registered (provisioned) wallpaper apps, e.g. Frosted Colours or Horizon Background.
 * @param id
 */
DesktopManager.prototype.applyRegisteredWallpaper = function(id) {
	this.clearWallpaperContent();
	var frame = this.ensureWallpaperFrame();
	if (!frame) return;
	if (typeof appManager !== "undefined" && typeof appManager.setWallpaper === "function")
		appManager.setWallpaper(id);
	else frame.src = "https://iemand005.github.io/FrostedColours/";
};

/** Restore the default registered wallpaper (the first one registered). */
DesktopManager.prototype.restoreDefaultWallpaper = function() {
	var defaultId = "colors";
	if (typeof appManager !== "undefined" && appManager._wallpaper)
		defaultId = appManager._wallpaper.id;
	this.applyRegisteredWallpaper(defaultId);
};

/** Forget the user-picked wallpaper image so "None" persists across reloads. */
DesktopManager.prototype.clearWallpaperCache = function() {
	try {
		if (typeof settings !== "undefined" && settings.set) settings.set("wallpaperImage", null);
	} catch (ex) {}
	try { window.localStorage.removeItem("wallpaperImage"); } catch (ex) {}
	initWallpaperDB(function(db) {
		var transaction = db.transaction(["wallpapers"], "readwrite");
		var store = transaction.objectStore("wallpapers");
		store.delete("current");
	}, function() {});
};

window.desktopManager = new DesktopManager();

function isFileDrag(ev) {
	var transfer = ev && ev.dataTransfer;
	var types = transfer && transfer.types;
	if (!types) return false;
	for (var i = 0; i < types.length; i++) {
		if (String(types[i]).toLowerCase() === "files") return true;
	}
	return false;
}

function setDesktopDragOpacity(opacity) {
	var desktop = document.getElementById("desktop");
	if (desktop) desktop.style.opacity = opacity;
}

// Drag and drop wallpaper support: drag and drop an image file onto the desktop to set it as wallpaper.
window.ondrag = document.ondrag = function(ev){
    ev = ev || window.event;
    if (!isFileDrag(ev)) return;
    setDesktopDragOpacity("0.5");
};

window.ondragleave = document.ondragleave = function(ev){
    ev = ev || window.event;
    if (!isFileDrag(ev)) return;
    setDesktopDragOpacity("");
};

window.ondragend = document.ondragend = function(){
    setDesktopDragOpacity("");
};

/**
 * Initialize IndexedDB for wallpaper storage.
 * Skip IndexedDB for file:// scheme (HTAs, local files).
 */
/** @type {IDBDatabase?} */
var wallpaperDB = null;
/**
 * @param {(db:IDBDatabase)=>void} onSuccess
 * @param {(error:Error?)=>void} onFailure
 */
function initWallpaperDB(onSuccess, onFailure) {
    // IndexedDB is only available over http/https, not file:// scheme
    var isFileScheme = window.location.protocol === "file:";
    if (isFileScheme) {
        if (onFailure) onFailure(new Error("IndexedDB not available for file:// scheme"));
        return;
    }

    if (typeof indexedDB === "undefined") {
        if (onFailure) onFailure(new Error("IndexedDB not supported"));
        return;
    }

    if (wallpaperDB) {
        onSuccess(wallpaperDB);
        return;
    }

    var request = indexedDB.open("LVOSWallpaperDB", 1);

    request.onerror = function() {
        if (onFailure) onFailure(request.error);
    };

    request.onsuccess = function() {
        wallpaperDB = request.result;
        onSuccess(wallpaperDB);
    };

    request.onupgradeneeded = function(event) {
        if (!event.target) return;
        var db = event.target.result;
        if (!db.objectStoreNames.contains("wallpapers")) {
            db.createObjectStore("wallpapers", { keyPath: "id" });
        }
    };
}
/**
 * /
 * @param {string} dataUrl
 */
function localStorageFabblack(dataUrl) {
	if (!dataUrl) return;
	try {
		if (typeof settings !== "undefined" && settings.set) settings.set("wallpaperImage", dataUrl);
		else throw new Error("Settings unavailable");
	} catch (ex) {
		try { window.localStorage.setItem("wallpaperImage", dataUrl); } catch (ex2) {}
	}
}

/**
 * Store wallpaper image blob to IndexedDB, with localStorage fallback.
 * @param {Blob} blob
 * @param {string} dataUrl - Optional data URL representation of the blob
 */
function saveWallpaperToCache(blob, dataUrl) {
    if (!(blob instanceof Blob)) return;

    initWallpaperDB(function (db) {
        var transaction = db.transaction(["wallpapers"], "readwrite");
        var store = transaction.objectStore("wallpapers");
        store.put({ id: "current", blob: blob, timestamp: Date.now() }).onerror = function() {
            localStorageFabblack(dataUrl);
        };
    }, function () {
        localStorageFabblack(dataUrl);
    });
}

/** @returns {boolean} True when the user chose a registered wallpaper, so cached images should not override it. */
function hasRegisteredWallpaperSelection() {
	if (typeof settings === "undefined" || !settings || typeof settings.get !== "function") return false;
	var selection = settings.get("wallpaper");
	return typeof selection === "string" && selection.indexOf("registered:") === 0;
}

/**
 * Load wallpaper from IndexedDB cache or localStorage fallback.
 */
function loadWallpaperFromCache() {
    initWallpaperDB(function(db) {
        var store = db.transaction(["wallpapers"], "readonly").objectStore("wallpapers");
        var request = store.get("current");

        request.onsuccess = function() {
            var result = request.result;
            if (result && result.blob && window.desktopManager && !hasRegisteredWallpaperSelection()) {
                window.desktopManager.applyWallpaperImage(URL.createObjectURL(result.blob));
            } else {
                loadWallpaperFromLocalStorage();
            }
        };

        request.onerror = loadWallpaperFromLocalStorage;
    }, loadWallpaperFromLocalStorage);
}

/**
 * Load wallpaper from localStorage as fallback.
 */
function loadWallpaperFromLocalStorage() {
	if (hasRegisteredWallpaperSelection()) return;
	var key = "wallpaperImage";
	var cachedWallpaper;
	try {
		cachedWallpaper = typeof settings !== "undefined" ? settings.get(key) : window.localStorage.getItem(key);
	} catch (ex) {
		try { cachedWallpaper = window.localStorage.getItem(key); } catch (ex2) {}
	}
	if (cachedWallpaper && window.desktopManager) window.desktopManager.applyWallpaperImage(cachedWallpaper);
}

/**
 * Handle dropped files and apply image files as wallpaper.
 * @param {DragEvent} ev
 */
function handleWallpaperDrop(ev) {
	ev.preventDefault();
	ev.stopPropagation();
    setDesktopDragOpacity("");


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
                    window.desktopManager.applyWallpaperImage(dataUrl);
                    saveWallpaperToCache(file, dataUrl);
                }
            } catch (ex) {}
        };
        reader.readAsDataURL(file);
        break; // Only use the first image
    }
}

window.ondrop = document.ondrop = handleWallpaperDrop;

// Load cached wallpaper on initialization
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadWallpaperFromCache, false);
} else {
    loadWallpaperFromCache();
}

var jebNumber = 0;

window.addEventListener("keydown", function(event) {
	if (event.key === "Shift" || event.keyCode === 16) {
		document.body.classList.add("slow-animations");
	}

	console.log(event.key)

	if (event.key === "j" && jebNumber === 0) {
		jebNumber++;
	} else if (event.key === "e" && jebNumber === 1) {
		jebNumber++;
	} else if (event.key === "b" && jebNumber === 2) {
		setTheme("jeb");
	}
}, false);

window.addEventListener("keyup", function(event) {
  if (event.key === "Shift" || event.keyCode === 16) {
    document.body.classList.remove("slow-animations");
  }
}, false);

var wallpaper = DesktopManager.getWallpaper();
if (wallpaper) {
	wallpaper.ondragover = function(ev) { ev.preventDefault(); };
	wallpaper.ondrop = function(ev) { ev.preventDefault(); };
}

// WebGraphics is loaded separately (deferred) and may be absent on some pages, so the
// screenshot helper is created on first use instead of at boot.
var screenShooter = null;
function getScreenShooter() {
	if (screenShooter) return screenShooter;
	if (typeof ScreenShooter === "undefined") return null;
	return screenShooter = new ScreenShooter;
}


var picker = "ElementPicker" in window ? new ElementPicker({
	onSelect: function (el) {
		var shooter = getScreenShooter();
		if (shooter) shooter.screenshotElement(el);
	},
    onMove: function(el) {
        if (el.nodeName === "ARTICLE") {
             var dialog = windowManager.getWindowOwningElement(el);
             if (dialog && dialog.target) this.highlight(dialog.target);
        }
        else this.highlight(el);
        // console.log(el)
        return true;
    }
}) : null;
if (picker) picker.register();


