/*\
   \________
   / ______/\                                                 \\
  / /     /\ \    LWM (Lasse's Window Manager)                 \\
 /_/_____/  \ \   Targetting: ES5 (with custom ES6 extensions)  \\
 \ \     \  / /   Copyright: Lasse Lauwerys © 2023 - 2026       //
  \ \_____\/ /    Created: 17/12/2023                          //
   \_______\/                                                 //
   /
\*/

"use strict"; // Strict mode is required for older browsers (tested on Chrome 48, Dialogs 8.1 both destkop and Metro mode).
"use esnext"; // This enables ECMAScript 6 (ES6) on older browsers that don't have it enabled by default. This enables the use of /*let*/var and const.
"use moz"; // Enable Mozilla JS extensions for old versions of Firefox so we can use /*let*/var and /*const*/var on those too.

// Modifiable settings
var useBlur = false,
	useMica = false,
	reflections = false,
	fasterDialogTracking = true,
	canSave = true,
	IE11Booster = true,
	loadingOverlay = false,
	flipped = false,
	useTransform = false,
	useScale = false,
	aeroSnap = false,
	updateRateLimit = false,
    hasLocalStorage = false;

var isIE = typeof window != "undefined" && typeof document != "undefined" && !!window.MSInputMethodContext && document.documentMode == 11;

try {
    hasLocalStorage = typeof localStorage != "undefined";
} catch(ex) { console.warn("Local storage access denied.", ex); }

if (isIE) {
    useTransform = true;
    document.body.classList.add("use-transform");
}

if (!hasLocalStorage) canSave  = false;

// HTA can expose PointerEvent without behaving correctly for drag/resize, so prefer the old IE pointer flags.
var supportsPointer =
    typeof window != "undefined" &&
    ("PointerEvent" in window || "MSPointerEvent" in window);
var supportsObjectFit = Boolean(
    document.documentElement &&
    document.documentElement.style &&
    typeof document.documentElement.style.objectFit != "undefined"
);
var supportsTransitions = (function () {
    var style = document.createElement("div").style;

    return (
        "transition" in style ||
        "WebkitTransition" in style ||
        "MozTransition" in style ||
        "OTransition" in style ||
        "msTransition" in style
    );
})();

if (supportsPointer) console.log("Supports pointer events!");

/** @param {Event} event */
function cancelDomEvent(event) {
	if (typeof event.preventDefault == "function") event.preventDefault();
	event.returnValue = false;
	if (typeof event.stopPropagation == "function") event.stopPropagation();
	event.cancelBubble = true;
	return false;
}

/** @param {Element} element */
function isDialog(element) {
	return element && element.classList && element.classList.contains("window");
}

/** @param {string} title */
function titlify(title) {
	return title.toLowerCase().split(" ").join("-");
}

function WindowManager() {
	/** @type {DialogMap} */
	this._windows = {};

	/** @type {DesktopState?} */
	this._windowStates = null;

	this._isBlurEnabled = true;
	this._isMicaEnabled = false;
    this._isWindowUpdatesEnabled = false;   

    this.isDragging = false;

	var self = this;
	/** @type {(ev:Event)=>void} */
    this.resizeHandler = function() {
		self.forEachWindow(function (window) { window.update(); });
	}

	/** @param {PointerEvent | MouseEvent} event */
	this.windowDragEvent = function(event) {
		if (!event.buttons) {
			disableDialogDrag();
			return;
		}
		try {
			cancelDomEvent(event);
			if (updateRateLimit) {
				if (ticking) return;
				window.requestAnimationFrame(function() {
					handleWindowDrag(event.clientX, event.clientY);
					ticking = false;
				});
				ticking = true;
			} else handleWindowDrag(event.clientX, event.clientY);
		} catch (ex) {
			console.error(ex);
		}
	}
}

Object.defineProperty(WindowManager.prototype, "windows", {
	get: function() { return this._windows; }
});

Object.defineProperty(WindowManager.prototype, "windowStates", {
  get: function () {
    if (!this._windowStates && localStorage)
      try {
        var stringyy = localStorage.getItem("windowState");
        if (!stringyy) return null;
        /** @type {DesktopState} */
        var windowStates = JSON.parse(stringyy);
        this._windowStates = windowStates;
      } catch (ex) {
        if (ex instanceof Error) console.error(ex.message);
      }
    return this._windowStates;
  }
});

Object.defineProperty(WindowManager.prototype, "state", {
  get: function () {
    /** @type {DesktopState} */
    var state = {};
    for (var id in this.windows) if (this.windows[id]) state[id] = this.windows[id].getState();
    return state;
  }
});

Object.defineProperty(WindowManager.prototype, "isBlurEnabled", {
  get: function () { return this._isBlurEnabled; },
  set: function (value) {
    if (typeof value == "boolean") this._isBlurEnabled = value;
  }
});

Object.defineProperty(WindowManager.prototype, "isMicaEnabled", {
  get: function () {
    return this._isMicaEnabled;
  },
  set: function (value) {
    if (typeof value != "boolean") return;
    document.body.classList.toggle("mica", value);
    windowManager.forEachWindow(function(window) { window.mica = value; });
    this._isMicaEnabled = value;
  }
});

Object.defineProperty(WindowManager.prototype, "isWindowUpdatesEnabled", {
    get: function() { return this._isWindowUpdatesEnabled; },
    set: function(value) {
        if (value) window.addEventListener("resize", this.resizeHandler, false);
        else window.removeEventListener("resize", this.resizeHandler, false);
        this._isWindowUpdatesEnabled = value;
    }
});

WindowManager.prototype.saveState = function() {
	if (!loaded) return;
	console.log("Saving window state.");
	try {
		if (canSave && typeof localStorage != "undefined")
			localStorage.setItem("windowState", JSON.stringify(this.state));
	} catch (exception) {
		handleStorageException(exception);
	}
};

/** @param {Dialog} [dialog] */
WindowManager.prototype.loadState = function(dialog) { // TOaddEventListenerDO: Load the state from localstorage on object creation, then keep that in memory for reading and add a func like this that takes one dialog as param and only restores for that
	console.log("Loading window state.");
	if (canSave) try {
		if (!localStorage || !localStorage.windowState) return;
		var windowStates = this.windowStates;
        loaded = true;
		if (dialog && dialog.id) dialog.loadState(windowStates[dialog.id]), updateTopZ(dialog.z);
		else {
			var fails = [];
			for (var id in windowStates) try {
				if (windowManager.windows[id] && windowStates[id])
					windowManager.windows[id].loadState(windowStates[id]);
			} catch (ex) { fails.push(ex); }
			fails.forEach(function (fail) { console.error("Failed to load a window.", fail); });
			updateTopZ();
		}
	} catch (exception) {
		handleStorageException(exception);
	} else console.log("Storage access is disabled for this session!");
};


/** @param {WindowCallback} callback */
WindowManager.prototype.forEachWindow = function (callback) {
  for (var id in this.windows)
    if (this.windows.hasOwnProperty(id)) callback(this.windows[id], id);
};

/** @param {Application | HTMLElement} app */
WindowManager.prototype.loadApp = function(app) {
    try {
        this._windows[app.id] = new Dialog(app);
        this._windows[app.id].mica = this.isMicaEnabled || false;
    } catch(ex) { console.warn("Appleload failed", ex); }
};

/** @param {boolean} enabled */
WindowManager.prototype.toggleDragging = function(enabled) {
	// windowManager.forEachWindow(function(dialog) { dialog.togglePointerEvents(!enabled); });
	ClickOffset.toggleDragEventHandler(enabled, this.windowDragEvent);
    this.isDragging = enabled;
};

function ClickOffset() {
	this.clickX = 0;
	this.clickY = 0;
	this.height = 0;
	this.width = 0;
	this.startY = 0;
	this.startX = 0;
	this.start = new Vector;

	this.last = 0;
	this.start = 0;
	this.position = new Vector;
	this.lastPosition = new Vector;
	this.difference = new Vector;

    /** @type {((ev:PointerEvent|MouseEvent)=>void)?} */
    this.dragHandler = null;
}

ClickOffset._overlay = document.createElement("div");
ClickOffset._overlay.className = "drag-overlay";
ClickOffset.disableOverlay = function (/** @type {MouseEvent} */ev) { if (!ev.buttons) ClickOffset._overlay.remove(); }
window.addEventListener("mousemove", ClickOffset.disableOverlay, false);
window.addEventListener("mouseup", ClickOffset.disableOverlay, false);
window.addEventListener("mouseout", ClickOffset.disableOverlay, false);

/** @type {number} */
var dragStopTimer;

window.addEventListener("pointermove", function(ev) {
    // console.log("mouse moving");
	if (!ev.buttons) ClickOffset._overlay.remove();

	ClickOffset._overlay.style.display = "block";

    clearTimeout(dragStopTimer);

    dragStopTimer = setTimeout(() => {
        // console.log("mouse stopped");
	ClickOffset._overlay.style.display = "none";

    }, 50);
});

ClickOffset.prototype.reset = function () {
	var self = this;
	self.start = Date.now();
	self.last = self.start;
	self.position.x = 0, self.position.y = 0;
	return this;
};
/**
 * @param {number} x 
 * @param {number} y 
 */
ClickOffset.prototype.update = function(x, y){
	var self = this;
	self.last = Date.now();
	self.position.x = x, self.position.y = y;
    var lastPosition = self.position.clone();
	self.difference = self.lastPosition.clone().sub(self.position);

    self.lastPosition = lastPosition;
	return self;
};

ClickOffset.prototype.clear = function () {
	this.clickX = 0;
	this.clickY = 0;
};
/**
 * @param {number} x 
 * @param {number} y 
 * @param {number} [width ]
 * @param {number} [height] 
 * @param {number} [startX] 
 * @param {number} [startY] 
 */
ClickOffset.prototype.init = function (x, y, width, height, startX, startY) {
    this.reset();
	this.clickX = x;
	this.clickY = y;
    if (!width || !height || !startX || !startY) return;
	this.width = width;
	this.height = height;
	this.startX = startX;
	this.startY = startY;
    return this;
};

/**
 * @param {boolean} enable
 * @param {(ev:PointerEvent|MouseEvent)=>void} handler
 */
ClickOffset.toggleDragEventHandler = function (enable, handler) {
    (enable ? document.addEventListener : document.removeEventListener)(supportsPointer ? "pointermove" : "mousemove", handler, false);
    console.log(enable ? "Starting drag" : "Ending drag");
	if (!this._overlay) return;
	if (enable) document.body.appendChild(this._overlay);
	else this._overlay.remove();
}

/** @param {boolean} enable */
ClickOffset.prototype.toggleDragEventHandler = function (enable) {
    if (this.dragHandler) ClickOffset.toggleDragEventHandler(enable, this.dragHandler);
}

/**
 * A window that can be moved around and resized and stuff.
 * @author Lasse Lauwerys
 * @param {HTMLElement | Application} object This is a dialog element from the HTML structure, or an object that defines the properties of the window.
 * @param {boolean} [create]
 */
function Dialog(object, create) {
    
    this._x = 0;
    this._y = 0;
    this._z = 0;
    this._width = 0;
    this._height = 0;
    this._isMinWidth = false;
    this._isMinHeight = false;

    /** @type {Window?} */
    this._popupWindow = null;

    /** @type {string?} */
    this._src = null;

    this._minWidth = 200;
    this._minHeight = 200;
    this._maxWidth = 1000;
    this._maxHeight = 1000;
    this._minAspectRatio = 0;
    this._maxAspectRatio = Infinity;
    this._mica = useMica;

    this._useTransform = useTransform;
    this._useScale = useScale;

    this._skew = 0;

	this._bodyOffset = { width: 0, height: 0, x: 0, y: 0 };
    
    if (!object) return;
    if (!create) create = false;

    /** @type {HTMLElement?} */
    this.target = null;
    var id = object.id;

    /** @type {Application?} */
    this.application = null;
    if (!isElement(object))
        this.application = object;
	
    if (!id) id = object.title;
    if (object.title) this._title = object.title;
    else {
        var titleElement = this.getTitleElement();
        if (titleElement) this._title = titleElement.innerText;
        if (!id) id = this.id || this.title || "";
    }


    
    this._id = id;
    /** @type {HTMLButtonElement[]} */
    this.buttons = [];
    this.originalBody = this.body;
    this.clickOffset = new ClickOffset;

    if(!this.scroll && this.body) this.body.style.overflow = "hidden";

    var applist = document.getElementById("applist");
    if (applist) applist.appendChild(this.createOpenButton());
    
    var metroapplist = document.getElementById("metroapplist");
    if (metroapplist) metroapplist.appendChild(this.createOpenButton());
    if (create || isElement(object)) this.initWithObject(object);

	this._popupPositionInterval = 0;
}
/**
 * @param {any} object
 * @returns {object is HTMLElement}
 */
function isElement(object) {
    return object && "nodeType" in object;
}
/**
 * @param {string} name 
 * @param {Element} [parent] 
 */
Dialog.prototype.getElementByTagOrClassName = function (name, parent) {
    var target = parent || this.target;
    if (!target) return null;
    var elements = target.getElementsByTagName(name);
    if (!elements || !elements.length) elements = target.getElementsByClassName(name);
    var element = elements.length ? elements[0] : null;
    if (isElement(element)) return element;
    return null;
}

/** @param {HTMLElement | Application | Dialog} object */
Dialog.prototype.initWithObject = function(object) {
    if (!object) return;

    if (object instanceof Dialog) {
        if (object.target) return;
        else if (object.application) object = object.application;
    }

    if (!(object instanceof Dialog)) {
        if (isElement(object)) {
            if (!isDialog(object)) return console.warn("This is not a dialog element");
            this.target = object;
            if (this.target.parentElement && this.target.parentElement.nodeName == "TEMPLATE") return;
            this.close();
        } else {
            this.application = object;
            // this.closeable = true;
            var newDialog = createDialog();
            this.target = newDialog;
            try {

                // windowManager.loadState(this);
            } finally {}
            if (object.classes && typeof object.classes == 'object'){
                object.classes.forEach(function (someclass) { this.target && this.target.classList.add(someclass); }, this); // We can't use class since it's a keyword!!
            }
            this.openUrl(object.src);
            this.setTitle(object.title);
            this.fixed = object.fixed;
            this.scroll = object.scroll;
            if (this.frame) {
                if (object.microphone || object.camera) this.frame.setAttribute("allow", "camera; microphone");
                this.frame.setAttribute("allow", "fullscreen");
            }

            this.moveEvents = object.moveEvents || false;
        }
    }

    this.setMinSize(180, 250);
    
    this.originalBody = this.body;

    if(!this.scroll && this.body) this.body.style.overflow = "hidden";

    // This adds application shortcuts to the app drawer, which currently rests on the desktop. I will make another drawer for mobile and make a pop-up drawer from the dock with the option to pin apps to it. I probably won't have enough time to implement an in-browser file manager, the localStorage API is limited to 5-10MB and using persistent storage requires browser specific APIs that don't work consistently yet.
    // var applist = document.getElementById("applist");
    // if (applist) applist.appendChild(this.createOpenButton());
    // var metroapplist = document.getElementById("metroapplist");
    // if (metroapplist) metroapplist.appendChild(this.createOpenButton());

    this.toggleCloseButton(true);
    this.toggleFullButton(true);
    if (this.verifyEjectCapability()) this.toggleEjectButton(true);

    this.exchangeDialogMouseUpEvent = this.messageFrame.bind(this, "mouseUp", { difference: new Vector });

    var self = this;
    /** @param {Position} difference */
    this.exchangeDialogMoveEvent = function(difference) { // Async is not supported in IE11?!? I chose some async since we don't need the return value and I need the window move to be as fast as possible. The next best option is a service worker!!
        if (difference && self.clickOffset) this.messageFrame("windowMove", self.clickOffset.update(difference.x, difference.y));
    };

    // if (object.body) this.body.appendChild(object.body);
    /** @type {(ev:MouseEvent|PointerEvent)=>void} */
    var activationHandler = function (ev) {
        windowActivationEvent(ev, self)
    };

    var target = this.target;
    if (target) {

        var borderSection = this.getElementByTagOrClassName("section");

        var createSizers = true;
		var createTouchSizers = true;

        if(borderSection && !this.fixed && createSizers) {
            for (var index = 0; index < 8; index++) {

                var sizerId = "sizer-" + (index + 1);

                var div = this.getElementByTagOrClassName(sizerId);
                if (!div || !(isElement(div))) div = document.createElement("div");
                div.draggable = false, div.id = String(index + 1), div.classList.add(sizerId);
                /** @type {(this: GlobalEventHandlers, ev: PointerEvent | MouseEvent) => any} */
                var pointerDown = function (ev) {
                    cancelDomEvent(ev);
                    if (ev.target && isElement(ev.target)) dragAction.set(Number(ev.target.id));
                    activationHandler(ev);
                }; // You can also put index + 1 in here instead for optimal efficiency and minimalism, but Internet Explorer is not a very stubborn browser but netscape is and does not instantiate the index variable but keeps one in memory resulting in resize direction being 9. Despite this it uses very little memory compared to Firefox and Chrome?
                if (supportsPointer) div.onpointerdown = pointerDown;
                else div.onmousedown = pointerDown;
                target.appendChild(div);
            }

			if (createTouchSizers) {
				for (var index = 0; index < 8; index++) {

					var id = index + 1;
					var sizerId = "touch-sizer-" + id;

					var div = this.getElementByTagOrClassName(sizerId);
					if (!div || !(isElement(div))) div = document.createElement("div");
					div.draggable = false, div.id = "touch-" + (index + 1), div.classList.add(sizerId);
					div.classList.add("touch");
					
					var touchDown = function(id) {
						/** @type {(this: GlobalEventHandlers, ev: PointerEvent) => any} */
						return function (ev) {
							if (ev.pointerType != "touch") {
								dragAction.set(-1);
								return;
							}
							cancelDomEvent(ev);
							console.log(ev.type, ev.pointerType);
							// ev.pointerType = "";
							if (ev.target && isElement(ev.target)) dragAction.set(id);
							activationHandler(ev);
						}
					}(id); // You can also put index + 1 in here instead for optimal efficiency and minimalism, but Internet Explorer is not a very stubborn browser but netscape is and does not instantiate the index variable but keeps one in memory resulting in resize direction being 9. Despite this it uses very little memory compared to Firefox and Chrome?
					if (supportsPointer) div.onpointerdown = touchDown;
					target.appendChild(div);
				}
			}
        }
        
        target.addEventListener("dragstart", cancelDomEvent, false);
        target.addEventListener("selectstart", cancelDomEvent, false);

        var body = this.body;
        if (body)
            body.addEventListener("load", function () { try { self.verifyEjectCapability(); } catch (exception) { if (target) target.getElementsByTagName("button")[0].style.display = "none"; }}, false);

        var header = this.titleBar;
        if (header) header.addEventListener("dblclick", this.toggleMaximized.bind(this, undefined), false);


        if (supportsPointer) target.addEventListener("pointerdown", activationHandler, false);
        else target.addEventListener("mousedown", activationHandler, false);
        target.onmousedown = activationHandler;
        target.getElementsByTagName("button")[windowButtons.eject].addEventListener("click", function(event) {
            self.createPopout();
            self.quit();
        }, false);
        
        var buttons = target.getElementsByTagName("button");
        buttons[windowButtons.close].addEventListener("click", function () {
            self.close();
        }, false);
        buttons[windowButtons.full].addEventListener("click", function () {
            self.toggleMaximized();
        }, false);

        this.toggleOpen(false);
    }

    if (this.id) windowManager.windows[this.id] = this;

	this.updateUseTransform(this.useTransform);
	this.updateScale(this.useScale);
    // this.useTransform = this.useTransform;
    // this.useScale = this.useScale;
    this.update();
}

/**
 * @param {number} a
 * @param {number} b
 */
function max(a, b) {
  return a > b ? a : b;
}

/**
 * @param {number} a
 * @param {number} b
 */
function min(a, b) {
  return a < b ? a : b;
}

/**
 * @param {HTMLElement} element
 * @param {number} x
 * @param {number} y
 * @param {number} [skew]
 */
function translateElement(element, x, y, skew) {
    var translate = "translate(" + toPixels(x) + "," + toPixels(y) + ")";
    if (skew) translate += " skewX(" + toDegree(skew) + ")";
    element.style.transform = translate;
    element.style.webkitTransform = translate;
}

/**
 * @param {HTMLElement} element
 * @param {number} width
 * @param {number} height
 */
function scaleElement(element, width, height) {
    element.style.width = toPixels(width);
    element.style.height = toPixels(height);
}

Object.defineProperty(Dialog.prototype, "isOpen", {
    get: function() { return Boolean(this.target && this.target.classList.contains("open")); },
    set: function(open) {
        this.toggleOpen(open);
    }
});
Object.defineProperty(Dialog.prototype, "frame", {
    get: function() { return this.target && this.target.getElementsByTagName("iframe")[0] || null; },
});
/**
 * @param {boolean} [forceOpen] 
 * @param {boolean} [kill] 
 */
Dialog.prototype.toggleOpen = function (forceOpen, kill) {
    var target = this.target;
    if (!target) return;
    var self = this;
    var shouldKill = kill && !forceOpen;
    this.toggleClassAnimatedOld("open", forceOpen, "opacity", function () {
        if (shouldKill) self.kill();
    }, function (enabled) {
        if (enabled) self.activate();
    });
}
/**
 * @param {boolean} [create]
 * @returns {HTMLIFrameElement?}
 */
Dialog.prototype.getOrCreateFrame = function(create) {
    var frame = this.frame;
    if (frame || !create || !this.body) return frame;
    return this.body.appendChild(document.createElement("iframe"));
};
Object.defineProperty(Dialog.prototype, "src", {
    get: function() { return this._src; },
    set: function(url) {
        var frame = this.getOrCreateFrame(true);
        if (frame) frame.src = url;
        this._src = url;
    }
});
Object.defineProperty(Dialog.prototype, "body", {
    get: function() {
        var content = this.content;
        if (!content) return null;
        return this.getElementByTagOrClassName("article", content);
    }
});
Object.defineProperty(Dialog.prototype, "titleBar", {
    get: function() { return this.getElementByTagOrClassName("header"); },
});

Object.defineProperty(Dialog.prototype, "mica", {
    get: function() { return this._mica; },
    set: function(mica) {
        if (mica) this._mica = this.injectMica();
        else this._mica = this.removeMica();
		this.move();
    }
});


Object.defineProperty(Dialog.prototype, "x", {
  get: function () {
    return this._x * window.innerWidth;
  },
  /** @param {number} x */
  set: function (x) {
    if (typeof x == "number") this.move(x, this.y);
  }
});

Object.defineProperty(Dialog.prototype, "y", {
  /** @returns {number} */
  get: function () {
    return this._y * window.innerHeight;
  },
  set: function (y) {
    if (typeof y == "number") this.move(this.x, y);
  }
});

Object.defineProperty(Dialog.prototype, "z", {
  get: function () { return this._z; },
  set: function (z) {
    if (typeof z == "number") this.setZ(z);
  }
});
    
Object.defineProperty(Dialog.prototype, "width", {
	get: function() { return this._width; },
	set: function(width) {
		if (typeof width != "number" || !this.target) return;

		this._width = max(min(width, this.maxWidth), this.minWidth);
		if (this.useTransform || this.useScale) this.target.style.width = toPixels(this._width);
		else this.target.style.right = toPixels(this.right);

		this._isMinWidth = this._width == this.minWidth;
	}
});

Object.defineProperty(Dialog.prototype, "height", {
	get: function() { return this._height; },
	set: function(height) {
		if (typeof height != "number" || !this.target) return;

		this._height = max(min(height, this.maxHeight), this.minHeight);
		if (this.useTransform || this.useScale) {
			this.target.style.height = toPixels(this._height);
		} else this.target.style.bottom = toPixels(this.bottom);

		this._isMinHeight = this._height == this.minHeight
	}
});
Object.defineProperty(Dialog.prototype, "minWidth", {
    get: function() { return this._minWidth; },
    set: function(width) { this.setMinSize(width); }
});
Object.defineProperty(Dialog.prototype, "minHeight", {
    get: function() { return this._minHeight; },
    set: function(height) { this.setMinSize(this.minWidth, height); }
});
Object.defineProperty(Dialog.prototype, "maxWidth", {
    get: function() { return this._maxWidth; },
    set: function(width) { this.setMaxSize(width); }
});
Object.defineProperty(Dialog.prototype, "maxHeight", {
    get: function() { return this._maxHeight; },
    set: function(height) { this.setMaxSize(this.maxWidth, height); }
});
/** @type {{x:number,y:number}} */
Object.defineProperty(Dialog.prototype, "position", {
    get: function() { return new Vector(this.x, this.y); },
    set: function(position) {
        if (position instanceof Vector)
            this.move(position.x, position.y);
    }
});

Object.defineProperty(Dialog.prototype, "size", {
    get: function() { return new Vector(this.width, this.height); },
    set: function(size) {
        if (typeof size.x != "number" || typeof size.y != "number") return;
        this.resize(size.x, size.y);
    }
});

Object.defineProperty(Dialog.prototype, "aspectRatio", {
    get: function() { return this.width / this.height; },
    set: function(aspect) { this.width = this.height * aspect; }
});

Object.defineProperty(Dialog.prototype, "minAspectRatio", {
    get: function() { return this._minAspectRatio; },
    set: function(aspect) { this.width = this.height * aspect; }
});

Object.defineProperty(Dialog.prototype, "maxAspectRatio", {
    get: function() { return this._maxAspectRatio; },
    set: function(aspect) { this.width = this.height * aspect; }
});

Object.defineProperty(Dialog.prototype, "top", {
    get: function() { return this.y; },
    set: function(top) {
        var newHeight = this.y - top + this.height;
        if (newHeight > this.maxHeight) {
            this.y = this.bottomFromTop - this.maxHeight;
            this.height = this.maxHeight;
        } else if (newHeight < this.minHeight) {
            this.y = this.bottomFromTop - this.minHeight;
            this.height = this.minHeight;
        } else {
            this.y = top;
            this.height = newHeight;
        }
    }
});

Object.defineProperty(Dialog.prototype, "left", {
    get: function() { return this.x; },
    set: function(left) {
        var newWidth  = this.x - left + this.width;
        if (newWidth > this.maxWidth) {
            this.x = this.rightFromLeft - this.maxWidth;
            this.width = this.maxWidth;
        } else if (newWidth < this.minWidth) {
            this.x = this.rightFromLeft - this.minWidth;
            this.width = this.minWidth;
        } else {
            this.x = left;
            this.width = newWidth;
        }
    }
});

Object.defineProperty(Dialog.prototype, "rightFromLeft", {
    get: function() { return this.x + this.width; },
    set: function(right) { this.width = right - this.x; }
});

Object.defineProperty(Dialog.prototype, "right", {
    get: function() { return window.innerWidth - this.rightFromLeft; },
    set: function(right) { this.width = (window.innerWidth - right) - this.x; }
});

Object.defineProperty(Dialog.prototype, "bottomFromTop", {
    get: function() { return this.y + this.height; },
    set: function(bottom) { this.height = bottom - this.y; }
});

Object.defineProperty(Dialog.prototype, "bottom", {
    get: function() { return window.innerHeight - this.bottomFromTop; },
    set: function(bottom) { this.height = (window.innerHeight - bottom) - this.y; }
});

Object.defineProperty(Dialog.prototype, "inset", {
    get: function() { return (this.bottom + this.right + this.left + this.top) / 4; },
    set: function(inset) { this.bottom = this.right = this.left = this.top = inset; }
});

Object.defineProperty(Dialog.prototype, "isMinWidth", {
    get: function () { return this._isMinWidth; }
});

Object.defineProperty(Dialog.prototype, "isMinHeight", {
    get: function () { return this._isMinHeight; }
});

Object.defineProperty(Dialog.prototype, "useTransform", {
    get: function () {return this._useTransform; },
    set: function(useTransform) { this.updateUseTransform(useTransform); }
});

Object.defineProperty(Dialog.prototype, "useScale", {
    get: function () {return this._useScale; },
    set: function(useScale) { this.updateScale(useScale); }
});

Object.defineProperty(Dialog.prototype, "title", {
    get: function() {
        if (this._title) return this._title;
        var titleElement = this.getTitleElement();
        if (titleElement && titleElement.innerHTML) return titleElement.innerHTML; 
        return this.id;
    },
    set: function(title) {
        this._title = title;
        var titleElement = this.getTitleElement();
        if (titleElement) titleElement.innerHTML = title;
    }
});

Object.defineProperty(Dialog.prototype, "maximized", {
    get: function() {
        if (!this.target) return false;
        return this.target.classList.contains("maximized");
    },
    set: function(maximized) {
        this.toggleMaximized(maximized);
    }
});

/** @param {string} title */
Dialog.prototype.setTitle = function(title) {
    this.title = title;
};

Object.defineProperty(Dialog.prototype, "id", {
    get: function() { return this._id || (this.target && this.target.getAttribute("id")); },
    set: function(id) {
        this._id = id;
        windowManager.windows[id] = this;
        if (this.target) this.target.setAttribute("id", id);
    }
});

Object.defineProperty(Dialog.prototype, "content", {
    get: function() {
        if (!this.target) return null;
        return this.getElementByTagOrClassName("content");
    }
});

Object.defineProperty(Dialog.prototype, "closeable", {
    get: function() { return this.application != null; }
});

Object.defineProperty(Dialog.prototype, "borderSize", {
    set: function (value) {
        if (!this.content) return;
        this.content.style.padding = toPixels(value);
        this.content.style.border = toPixels(value);
        this.content.style.borderRadius = toPixels(value);
    },
    get: function () { return this.content && fromPixels(this.content.style.padding); },
});

Object.defineProperty(Dialog.prototype, "popup", {
    get: function() { return this._popupWindow; }
});

Object.defineProperty(Dialog.prototype, "micaElement", {
    get: function() {
        try {
            if (!this.target) return null;
            var clipElem = this.target.getElementsByClassName("backdrop-filter");
            if (!clipElem.length) return null;
            var clip = clipElem[0];
            if (isElement(clip)) return clip;
        } catch(ex) { if (ex instanceof Error) console.log(ex.message) }
        return null;
    }
});

Object.defineProperty(Dialog.prototype, "micaBackdrop", {
    get: function() {
        try {
			var micaElement = this.micaElement;
            if (!micaElement) return null;
            var backdrop = micaElement.children[0];
            if (isElement(backdrop)) return backdrop;
        } catch(ex) { if (ex instanceof Error) console.log(ex.message) }
        return null;
    }
});

Object.defineProperty(Dialog.prototype, "skew", {
    set: function(/** @type {number} */skew) {
        // if (this.target) this.target.style.transform
        this._skew = skew;
        this.updateTranslation();
        // return null;
    }
});

/** @type {Dialog?} */
var focusedDialog = null;
Dialog.prototype.focus = function() {
    if (focusedDialog != null && focusedDialog.target)
        focusedDialog.target.removeAttribute("focus");
    if (this.target) this.target.setAttribute("focus", String(true));
    focusedDialog = this;
}
Dialog.prototype.activate = function() {
	this.focus();
	return this.setZ(topZ++), this.messageFrame(LVMessenger.types.open), activeDialogId = this.id, activeDialog = this, swapMetroBody();
};
Dialog.prototype.getTitleElement = function() { return this.getElementByTagOrClassName("h1"); };
/** @param {boolean} force */
Dialog.prototype.toggleTitlebar = function (force) {
	return this.titleBar && !this.titleBar.classList.toggle( "hidden", typeof force != "undefined" ? !force : undefined);
};
Dialog.prototype.open = function () {
	return (this.isOpen = true), windowManager.saveState(), this.isOpen;
};
Dialog.prototype.close = function () {
	return (this.isOpen = false), windowManager.saveState(), this.isOpen;
};
Dialog.prototype.getInnerRect = function () {
  	if (!this.target) return;
	return {
		top: this.target.offsetTop,
		left: this.target.offsetLeft,
		right: this.target.offsetLeft + this.target.offsetWidth,
		bottom: this.target.offsetTop + this.target.offsetHeight,
		width: this.target.offsetWidth,
		height: this.target.offsetHeight
	};
}; // This builds a rect without extra function calls and includes the dimension offsets caused by css transformations. This allows us to actually move the windows correctly WHILE the animation is playing. Try it out if you think you're fast enough (or change the animation speed)
/**
 * @param {HTMLElement?} element
 * @param {number} [index]
 */
function getRect(element, index) {
	if (!element) return null;
	return index ? element.getClientRects()[index] : element.getBoundingClientRect();
}
/** @param {number} [index] */
Dialog.prototype.getRect = function (index) { return getRect(this.target, index); };
/** @param {number} [index] */
Dialog.prototype.getBodyRect = function (index) { return getRect(this.body, index); };
/** @param {number} index */
Dialog.prototype.getButton = function (index) {
  return this.titleBar && this.titleBar.getElementsByTagName("button")[index];
};
Dialog.prototype.createOpenButton = function () {
    var openButton = document.createElement("button");
    this.buttons.unshift(openButton);
    openButton.appendChild(document.createTextNode(this.title || "?"));
    openButton.onclick = this.launch.bind(this);
    return openButton;
};
/**
 * @param {number} x
 * @param {number} y
 */
Dialog.prototype.setClickOffset = function(x, y) {
	var rect = this.getRect();
	if (!this.clickOffset || !rect) return;
	return this.clickOffset.init(x, y, window.width || rect.width, window.height || rect.height, this.x, this.y)
}
Dialog.prototype.verifyEjectCapability = function() { return Boolean(this.href); };
Object.defineProperty(Dialog.prototype, "href", { get: function () {
	if (!this.application) return null;
	return this.application.src;
}});
/** @param {boolean} enable */
Dialog.prototype.togglePointerEvents = function(enable) {
	var target = this.target;
	if (!target) return;
	if (enable == null) enable = target.style.pointerEvents == "none";
	if (enable) while (target.classList.contains("dragging")) target.className = target.className.replace("dragging", "");
	else if (!target.classList.contains("dragging")) target.className = target.className + " dragging";

	var events = enable ? "auto" : "none";
	target.style.pointerEvents = events;
	if (this.originalBody) this.originalBody.style.pointerEvents = events;
	var frame = this.frame;
	if (frame) frame.style.pointerEvents = events;
	return events;
}
/**
 * @param {number} buttonId
 * @param {boolean} [enable]
 */
Dialog.prototype.toggleButton = function (buttonId, enable) {
	var button = this.getButton(buttonId);
	return button && button.toggleAttribute("disabled", !enable);
};
Dialog.prototype.clearClickOffset = function () {
	this.clickOffset && this.clickOffset.clear();
};
/** @type {"webkitTransitionEnd" | "transitionend"} */
var transitionEndEvent = ('webkitTransition' in document.documentElement.style) ? 'webkitTransitionEnd' : 'transitionend';

/**
 * @param {HTMLElement} element 
 * @param {string} className 
 * @param {boolean} [enabled] 
 */
function setClass(element, className, enabled) {
	var re = new RegExp("(^|\\s)" + className + "(\\s|$)");

	if (typeof enabled == "undefined") enabled = element.className.indexOf(className) == -1;

	if (enabled) {
		if (!re.test(element.className))
			element.className = (element.className + " " + className).replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
	} else element.className = element.className.replace(re, " ").replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
	return element.className.indexOf(className) != -1;
}
Dialog.prototype.stopAnimating = function () {
	if (!this.target) return;
	this.target.classList.remove("animating");
}
/**
 * @param {string} className 
 * @param {boolean} [force] 
 * @param {string} [animationEndTrigger] 
 * @param {()=>void} [onEnd] 
 * @param {(this:Dialog,enabled:boolean)=>void} [onToggled] 
 * @returns 
 */
Dialog.prototype.toggleClassAnimatedOld = function (className, force, animationEndTrigger, onEnd, onToggled) {
	this.toggleClassAnimated(className, force, function(propertyName) {
		return propertyName == animationEndTrigger;
	}, onEnd, onToggled);
}
/**
 * @param {string} className 
 * @param {boolean} [force] 
 * @param {(name:string)=>boolean} [onTransitionEnd] 
 * @param {()=>void} [onEnd] 
 * @param {(this:Dialog,enabled:boolean)=>void} [onToggled] 
 * @returns 
 */
Dialog.prototype.toggleClassAnimated = function (className, force, onTransitionEnd, onEnd, onToggled) {
	var target = this.target;
	if (!target) return;
	var dialog = this;
	if (supportsTransitions) {
		target.classList.add("animating");
		/** @type {(ev: TransitionEvent)=>void} */
		var animationHandler = function(event) {
			if (onTransitionEnd && !onTransitionEnd(event.propertyName) || !target) return;
			dialog.stopAnimating();
			console.log("Aborting animation over " + event.propertyName);
			target.removeEventListener(transitionEndEvent, animationHandler, false);
			if (onEnd) onEnd();
		};
		target.addEventListener(transitionEndEvent, animationHandler, false);
	}

	window.requestAnimationFrame(function() {
		if (!target) return;
		try { void target.offsetWidth; } catch (e) {}
		var enabled = setClass(target, className, force);
		if (onToggled) onToggled.call(dialog, enabled);
	});
};
/** @param {boolean} [isMaximized] */
Dialog.prototype.toggleMinSizeConstraints = function(isMaximized) {
    if (!this.target) return;
    this.target.style.minWidth = isMaximized ? "100%" : toPixels(this.minWidth);
    this.target.style.minHeight = isMaximized ? "100%" : toPixels(this.minHeight);
};
/** @param {boolean} [enable] */
Dialog.prototype.toggleMaximized = function (enable) {
	if (supportsTransitions) this.toggleClassAnimated("maximized", enable, function(name) {
		return name == "transform" || name == "width";
	}, undefined, function(isMaximized) {
		if (this.useTransform && this.target) this.toggleMinSizeConstraints(isMaximized);
	});
	else {
		var startPos = this.position;
		var startSize = this.size;
		var target = this.target;
		var self = this;
		if (!target) return;
		enable = !target.classList.contains("maximized");
		var toggleThingie = function() {
			self.x = startPos.x;
			self.y = startPos.y;
			self.width = startSize.x;
			self.height = startSize.y;
			if ( self.target) self.target.classList.toggle("maximized", enable);
		}
		if (!enable) toggleThingie();
		animate(300, function(t) {
			var ease = easeSharpCenterStrong;
			if (enable) {
				self.x = lerp(startPos.x, 0, ease(t));
				self.y = lerp(startPos.y, 0, ease(t));
				self.width = lerp(startSize.x, window.innerWidth, ease(t));
				self.height = lerp(startSize.y, window.innerHeight, ease(t));
			} else {
				self.x = lerp(0, startPos.x, ease(t));
				self.y = lerp(0, startPos.y, ease(t));
				self.width = lerp(window.innerWidth, startSize.x, ease(t));
				self.height = lerp(window.innerHeight, startSize.y, ease(t));
			}
		}, function() {
			if (enable) toggleThingie();
		});
	}
};
Dialog.prototype.maximize = function () {
  	this.toggleMaximized(true);
};
/** @param {boolean} [enable] */
Dialog.prototype.toggleCloseButton = function (enable) {
  	this.toggleButton(windowButtons.close, enable);
};
/** @param {boolean} [enable] */
Dialog.prototype.toggleEjectButton = function (enable) {
  	this.toggleButton(windowButtons.eject, enable);
};
/** @param {boolean} [enable] */
Dialog.prototype.toggleFullButton = function (enable) {
  	this.toggleButton(windowButtons.full, enable);
};
/**
 * @param {MessageType | string} type
 * @param {*} [message]
 */
Dialog.prototype.messageFrame = function (type, message) {
	var frame = this.frame;
	if (frame) LVMessenger.broadcastToChild(type, message, frame);
};
Dialog.prototype.updateTranslation = function () {
    if (this.useTransform && this.target) translateElement(this.target, this.x, this.y, this._skew);
}
/**
 * @param {number} [x]
 * @param {number} [y]
 */
Dialog.prototype.move = function (x, y) {
	if (typeof x == "undefined" || x == null) x = this.x || 0;
	if (typeof y == "undefined" || y == null) y = this.y || 0;
	var windowWidth = window.innerWidth;
	var windowHeight = window.innerHeight;
	(this._x = max(x, 0) / windowWidth), (this._y = max(y, 0) / windowHeight);
	if (!this.target) return;
	if (this.useTransform) this.updateTranslation();
	else {
		this.target.style.top = toPixels(this.top);
		this.target.style.left = toPixels(this.left);
        if (!this.useScale) {
            this.target.style.right = toPixels(this.right);
            this.target.style.bottom = toPixels(this.bottom);
        }
	}

	var micaElement = this.micaElement;
	if (micaElement) try {
		var backdrop = micaElement.firstChild;
		var wallpaperP = document.getElementById("wallpaper");
		if (!wallpaperP) return;
		var wallpaperImage = wallpaperP.children[0];
		if (!(isElement(backdrop)) || !wallpaperImage) return;
		translateElement(backdrop, -this.x, -this.y);

		var wallpaperWidth = wallpaperImage instanceof HTMLImageElement && wallpaperImage.clientWidth ? wallpaperImage.clientWidth : wallpaperP.clientWidth;
		var wallpaperHeight = wallpaperImage instanceof HTMLImageElement && wallpaperImage.clientHeight ? wallpaperImage.clientHeight : wallpaperP.clientHeight;

		backdrop.style.width = toPixels(wallpaperWidth);
		backdrop.style.height = toPixels(wallpaperHeight);
	} catch(ex) {}

    // i wanna add a like move event thing with velocity and stuff


};
/** @param {number} z */
Dialog.prototype.setZ = function(z) {
	this._z = z;
	if (isElement(this.target))
        this.target.style.zIndex = String(this._z);
};
/**
 * @param {number} [width]
 * @param {number} [height]
 */
Dialog.prototype.resize = function (width, height) {
	// this.resizeWithAspect(width, height);
	// return;
	if (this.body) this.body.style.boxSizing = "border-box";
	this.width = width || this.width;
	this.height = height || this.height;
};
Dialog.prototype.update = function () {
	this.move();
	this.resize();
};
/**
 * @param {number} [width]
 * @param {number} [height]
 */
Dialog.prototype.setMinSize = function (width, height) {
	this._minWidth = width || 180;
	this._minHeight = height || 200;
	this.resize();
}
/**
 * @param {number} [width]
 * @param {number} [height]
 */
Dialog.prototype.setMaxSize = function (width, height) {
	this._maxWidth = width || 180;
	this._maxHeight = height || 200;
	this.resize();
}
/** @param {number} ratio */
Dialog.prototype.setMinAspectRatio = function (ratio) {
	this._minAspectRatio = ratio;
	this.resize();
}
/** @typedef {"left" | "right" | "top" | "bottom" } Side */
/**
 * @param {number} ratio
 * @param {Side} [sideConstraint1]
 * @param {Side} [sideConstraint2]
 */
Dialog.prototype.enforceAspectRatio = function (ratio, sideConstraint1, sideConstraint2) {
	// this.aspectRatio = ratio;
	if (sideConstraint1 != undefined) {

	}
}
/**
 * @param {number} width
 * @param {number} height
 */
Dialog.prototype.resizeWithAspect = function (width, height) {
	var ratio = this.aspectRatio;

	var widthDelta = Math.abs(width - this.width);
	var heightDelta = Math.abs(height - this.height);

	if (widthDelta > heightDelta) {
		this.resize(width, width / ratio);
	} else {
		this.resize(height * ratio, height);
	}
};
Dialog.prototype.updateBodyOffset = function () {
	var bodyRect = this.getBodyRect();
	if (!bodyRect || (bodyRect.width == 0 && bodyRect.height == 0 && bodyRect.x == 0 && bodyRect.y == 0)) return;
	this._bodyOffset.width = this.width - bodyRect.width;
	this._bodyOffset.height = this.height - bodyRect.height;
	this._bodyOffset.x = this.x - bodyRect.x;
	this._bodyOffset.y = this.y - bodyRect.y;
};
/**
 * @param {number} width
 * @param {number} height
 */
Dialog.prototype.resizeBody = function (width, height) {
	this.updateBodyOffset();
	this.resize(width + this._bodyOffset.width, height + this._bodyOffset.height);
};
/**
 * @param {number} x
 * @param {number} y
 */
Dialog.prototype.moveBody = function (x, y) {
	this.updateBodyOffset();
	this.move(x + this._bodyOffset.x, y + this._bodyOffset.y);
};
/**
 * @param {number} top 
 * @param {number} left 
 * @param {number} right 
 * @param {number} bottom 
 */
Dialog.prototype.setInset = function(top, left, right, bottom) {
	if (!this.target) return;
	if (this.target.style.inset) this.target.style.inset = toPixels(top) + toPixels(left) + toPixels(right) + toPixels(bottom);
	else {
		this.target.style.top = toPixels(this.top);
		this.target.style.left = toPixels(this.left);
		if (!this.useScale) {
			this.target.style.right = toPixels(this.right);
			this.target.style.bottom = toPixels(this.bottom);
		}
	}
}
/** @param {string} url */
Dialog.prototype.openUrl = function(url) {
	var frame = this.getOrCreateFrame(true);
	if (!frame) return;
	frame.src = url;
	this._src = url;
};

Dialog.prototype.quit = function() {
    this.close();
};

Dialog.prototype.launch = function() {
	if (!this.isOpen) this.initWithObject(this);
	if (this.mica) this.injectMica();

	this.open();
};

Dialog.prototype.relaunch = function() {
	this.quit();
	this.launch();
};

Dialog.prototype.kill = function() {
	var parent = this.target && this.target.parentElement;
	if (parent && this.closeable && this.target) parent.removeChild(this.target);
};
Dialog.prototype.eject = function() {
	this.createPopout();
	this.quit();
};
Dialog.prototype.createPopout = function() {
	var body = this.body;
	var titlebar = this.titleBar;
	if (!body || !this.href) return;
	var rect = body.getBoundingClientRect();
	var titleBarHeight = titlebar && titlebar.getBoundingClientRect().height || 0;
	var viewboxPosition = getViewboxPosition();
	var propeties = {
		scrollbars: true,
		resizable: true,
		status: false,
		location: false,
		toolbar: false,
		menubar: false,
		width: rect.width,
		height: rect.height,
		left: rect.left + viewboxPosition.left,
		top: rect.top + viewboxPosition.top + titleBarHeight
	}

	this._popupWindow = window.open(this.href, this.title || "LVOS", stringifyDialogProperties(propeties));
	if (!this._popupWindow) return;
	var self = this;
	var prevRect = { x: -1, y: -1, width: -1, height: -1 };
	var windowChromeHeight = getWindowChromeHeight(window);
	var chromeHeight = getWindowChromeHeight(this._popupWindow);
	this._popupPositionInterval = setInterval(function() {
		if (!self._popupWindow || self._popupWindow.closed) {
			clearInterval(self._popupPositionInterval);
			self._popupPositionInterval = 0;
			self.launch();
			return;
		}

		var outerX = self._popupWindow.screenX, outerY = self._popupWindow.screenY;
		var width = self._popupWindow.innerWidth || self._popupWindow.outerWidth, height = self._popupWindow.innerHeight || self._popupWindow.outerHeight;
		outerX = Math.round(outerX);
		outerY = Math.round(outerY);
		width = Math.round(width);
		height = Math.round(height);

		if (outerX != prevRect.x || outerY != prevRect.y) {
			var x = outerX - window.screenX,
				y = outerY - window.screenY - windowChromeHeight + chromeHeight;

			console.log("pos:", outerX, outerY);
			self.moveBody(x, y);
			prevRect.x = outerX, prevRect.y = outerY;
		}

		if (width != prevRect.width || height != prevRect.height) {

			self.resizeBody(width, height);

			console.log("size:", width, width);

			prevRect.width = width, prevRect.height = height;
		}
	}, 100);
};
/** @param {Window} window */
function getWindowChromeHeight(window) {
	return window.outerHeight - window.innerHeight;
}
/** @param {boolean} useTransform */
Dialog.prototype.updateUseTransform = function(useTransform) {
	this._useTransform = useTransform;
	var target = this.target;
	if (!target) return;
	if (useTransform) {
		target.style.top = "0px";
		target.style.left = "0px";
		this.updateScale(true);
        this.toggleMinSizeConstraints(this.maximized);
	} else {
		target.style.transform = "";
		target.style.webkitTransform = "";
		target.style.width = "auto";
		target.style.height = "auto";
		target.style.top = toPixels(this.top);
		target.style.left = toPixels(this.left);
		target.style.right = toPixels(this.right);
		target.style.bottom = toPixels(this.bottom);
	}

	this.update();
}
/** @param {boolean} useScale */
Dialog.prototype.updateScale = function(useScale) {
	this._useScale = useScale;
	var target = this.target;
	if (!target) return;
	if (useScale) {
		target.style.right = "";
		target.style.bottom = "";
		target.classList.add("use-scale");
	} else {
		if (this.useTransform) return console.warn("Cannot disable scale if using ttansform");
		target.style.right = toPixels(this.right);
		target.style.bottom = toPixels(this.bottom);
	}

	this.update();
}

function getWallpaper() {
	return document.getElementById("wallpaper");
}
/** @returns {boolean} */
Dialog.prototype.injectMica = function() {
	try {
		if (!this.useTransform) console.warn("Dude you still gotta fix the mica here for oh right but can you psosible even do that??");
		if (!this.target) return false;
		var wallpaper = document.getElementById("wallpaper");
		if (!wallpaper) return false;
		// var newWallpaper = wallpaper.cloneNode(true);
		var wallpaperSrc = wallpaper.getAttribute("data-wallpaper-src") || "";
		var blurredSrc = wallpaper.getAttribute("data-blurred-src") || "";
		var preBlurredImage = blurredSrc != null;
		var clip = this.micaElement;
		if (!clip) return false;
		while (clip.firstChild) clip.removeChild(clip.firstChild);

		
		var micaWallpaper = null;
		if (isElement(wallpaper.children[0])) {
			micaWallpaper = wallpaper.children[0].cloneNode(true);
			if (!(isElement(micaWallpaper))) return false;
			if (supportsObjectFit) {
				micaWallpaper.removeAttribute("style");
				micaWallpaper.className = "mica-backdrop";
				if (preBlurredImage &&  micaWallpaper instanceof HTMLIFrameElement && blurredSrc)
					micaWallpaper.src = blurredSrc;
			} else {
				micaWallpaper.className = "mica-backdrop legacy-wallpaper-image";
				micaWallpaper.style.backgroundImage = "url('" + (blurredSrc || wallpaperSrc).replace(/'/g, "\\'") + "')";
			}
		} else {
			micaWallpaper = document.createElement("img");
			micaWallpaper.className = "mica-backdrop legacy-wallpaper-image";
			micaWallpaper.style.backgroundImage = "url('" + (blurredSrc || wallpaperSrc).replace(/'/g, "\\'") + "')";
		}

		clip.appendChild(micaWallpaper);
		this.target.classList.add("mica");
		
		return true;
	} catch(ex) { console.warn(ex); }
	return false;
};

Dialog.prototype.removeMica = function() {
	if (!this.target) return false;
	this.target.classList.remove("mica");
	var clip = this.micaElement;
	if (!clip) return false;
	while (clip.firstChild) clip.firstChild.remove();
	return false;
};

// No longer revlant
function DragAction() { // BS
    /** @type {DragFunction} */
    this.execute = function(){};
    /** @type {DragFunction[]} */
    this.resizeFunctions = [
        function(dialog, offset, difference){ dialog.move(offset.startX + difference.x, offset.startY + difference.y); }, // Move
        function(dialog, offset, difference){ dialog.top = offset.startY + difference.y }, // Top
        function(dialog, offset, difference){ dialog.width = offset.width + difference.x }, // Right
        function(dialog, offset, difference){ dialog.height = offset.height + difference.y }, // Bottom
        function(dialog, offset, difference){ dialog.left = offset.startX + difference.x; }, // Left
        function(dialog, offset, difference){ dialog.top = offset.startY + difference.y, dialog.left = offset.startX + difference.x; }, // Top Left
        function(dialog, offset, difference){ dialog.width = offset.width + difference.x, dialog.top = offset.startY + difference.y },// Top right
        function(dialog, offset, difference){ dialog.height = offset.height + difference.y, dialog.width = offset.width + difference.x }, // Bottom right
        function(dialog, offset, difference){ dialog.left = offset.startX + difference.x, dialog.width = offset.width - difference.x, dialog.height = offset.height + difference.y }, // Bottom left
    ];
}

/** @param {number} [direction] */
DragAction.prototype.set = function (direction) {
  this.execute =
    this.resizeFunctions[direction || 0] ||
    function () {
      console.log("bleed mself sdry");
    };
};

/** @param {HTMLDocument} document */
function DocumentCrawler(document){
    this.document = document;
}

DocumentCrawler.prototype.getMetro = function () { return this.document.getElementById("metrobody"); };
DocumentCrawler.prototype.getMetroBody = function () { var metro = this.getMetro(); return metro && metro.firstChild; };
DocumentCrawler.prototype.getAllDialogs = function () { return this.document.getElementsByClassName("window") };
DocumentCrawler.prototype.getDialogsContainer = function () { return this.document.getElementById("windows") };
DocumentCrawler.prototype.getOverlay = function () { return document.getElementById("overlay"); }; // I don't know why I d;dn't use getters to start with.
DocumentCrawler.prototype.getDesktop = function () { return document.getElementById("desktop"); };

// Setting up the global variables after defining the classes to avoid undefined prototypes!
var windowManager = new WindowManager();
windowManager.isWindowUpdatesEnabled = true;
var bodyCrawler = new DocumentCrawler(document);;
window.onload=
document.onload = function () {
    bodyCrawler = new DocumentCrawler(document);

    initializeDialogs();
    toggleReflections(reflections);
}
var dragAction = new DragAction();
var windowButtons = {
    eject: 0,
    full: 1,
    close: 2
};
/** @type {string?} */
var activeDialogId = null;
/** @type {Dialog?} */
var activeDialog = null;
var resizeDirection = 0;
var topZ = 100;
/** @type {string?} */
var metroBodyOrigin;
var loaded = false;
/** @type {number} */
var timeout = -1;

/**
 * @param {MessageType} type
 * @param {any} data
 * @param {string?} source
 */
function messageReceived(type, data, source){ // I have yet to make a wrapper function that takes care of the types and data parsing for ease of use by another user who doesn't understand what I'm doing here, it needs to be done manually by me for now!
    var types = LVMessenger.types;
    if (source) {
        if (type == types.windowSize) windowManager.windows[source].resizeBody(data.width, data.height); // If our dialog gives us a specific size, we act accordingly and give it what it wants! We swith the window size from being based on the non-client area size, and we make the non-client area wrap around the client area, fully giving sizing control to the client. This way our system can suffice the client's demands.
        switch (type) {
            case types.launchOverlay:
                var overlay = bodyCrawler.getOverlay();
                if (!overlay) break;
                overlay.ontransitionend = function () {
                    var dialog = windowManager.windows[source];
                    dialog.messageFrame(LVMessenger.types.prepareToLaunchOverlay);
                    if (dialog.frame) {
                        var oriurl = new URL(dialog.frame.src);
                        oriurl.searchParams.set("fullscreen", String(true));
                        dialog.frame.src = oriurl.href;
                    }
                    if (!overlay) return;
                    overlay.ontransitionend = null;
                    overlay.requestFullscreen();
                    if (dialog.body) overlay.appendChild(dialog.body);
                    window.setTimeout(overlay.classList.add.bind(overlay.classList, "shown"), 500);
                };
                overlay.classList.toggle("open");
                break;
            case types.readyToLaunchOverlay:
                var overlay = bodyCrawler.getOverlay();
                if (!overlay) break;
                var dialog = windowManager.windows[source];
                if (dialog.body) overlay.appendChild(dialog.body);
                window.setTimeout(overlay.classList.add.bind(overlay.classList, "shown"), 500);
                break;
        }
        console.log("Received message " + type);
    }
}

window.__LVMessengerReceive = messageReceived;
LVMessenger.receive(messageReceived);

function swapMetroBody() {
    if (!flipped) return;
    restoreMetroBody();
    activeDialogToMetro();
}

function restoreMetroBody() {
    // if (metroBodyOrigin) retrieveDialogBodyFromMetro(windowManager.windows[metroBodyOrigin]);
}

function activeDialogToMetro() {
    if (activeDialog) activeDialog.exportDialogBodyToMetro();
}

/**
 * @param {boolean} enable
 */
function flip(enable){
    var tesktop = bodyCrawler.getDesktop();
    if (!tesktop) return;
    tesktop.toggleAttribute("flipped", enable); // Deprecated, I am switching transferring this attribute to a class.
    flipHandler(tesktop.classList.toggle("flipped", enable));
}

/**
 * @param {boolean} enabled
 */
function flipHandler(enabled){
    toggleCharms(false);
    swapMetroBody();
    return flipped = enabled;
}

// var toggleOverlay = bodyCrawler.getOverlay()
//   ? bodyCrawler.getOverlay().classList.toggle.bind(
//       bodyCrawler.getOverlay().classList,
//       "open"
//     )
//   : function () {
//       console.warn("Overlay wasn't found on initialization.");
//     }; // The force attribute gets automatically forwarded!

// toggleOverlay(loadingOverlay);
// checkForFlip();

// var desktopElement = document.getElementById("desktop");

// if (loadingOverlay && desktopElement)
//   desktopElement.ontransitionend = checkForFlip;
// function checkForFlip() {

//     if (!loaded) {
//         //I'll s'
//         console.log("th I'll set the timeoutrat");
//         if (timeout != -1) return;
//         timeout = setTimeout(function () {
//             timeout = -1;
//             toggleOverlay(!(!loaded ? (loaded = true) : false));
//             updateBlurState();
//         }, 500);
//     }

//     if (false && window.matchMedia('only screen and (max-width: 300px), (pointer:none), (pointer:coarse)').matches) {
//         console.log("Switching to Mobile mode...");
//         if (!flipped) {
//             flipHandler(true);
//             activeDialogToMetro();
//         }
//     } else if (flipped) {
//         console.log("Switching to Desktop mode...");
//         flipHandler(false);
//         restoreMetroBody();
//     }
// };

// window.onresize = checkForFlip;

function initializeDialogs() {
    if (supportsPointer) {
        document.onpointerup = disableDialogDrag;
        window.onpointerup = disableDialogDrag;
    } else {
        // document.onmouseup = disableDialogDrag;
        // window.onmouseup = disableDialogDrag;
        document.addEventListener("mouseup", disableDialogDrag, false);
        window.addEventListener("mouseup", disableDialogDrag, false);
    }
    
    dragAction.set(0);
    var dialogs = bodyCrawler.getAllDialogs();
    Array.from(dialogs).forEach(function (dialog) {
        if (isElement(dialog))
          windowManager.loadApp(dialog);
        
    });
    //flip();
    // checkForFlip();
    windowManager.loadState();
}

/**
 * Activates the window on which the provided event was fired.
 * @param {MouseEvent | PointerEvent} event
 * @param {Dialog} dialog
 */
function windowActivationEvent(event, dialog) {
    // If the event originated from an interactive element, don't start a drag
    try {
        var node = event && (event.target || event.srcElement);
        var isInteractive = false;
        while (node && isElement(node) && node.nodeType == 1) {
            var tn = (node.tagName || "").toLowerCase();
            if (tn == "input" || tn == "textarea" || tn == "select" || tn == "button" || tn == "a" || tn == "label" || tn == "output") { isInteractive = true; break; }
            if (node.hasAttribute && node.hasAttribute("contenteditable")) { isInteractive = true; break; }
            node = node.parentElement;
        }
        if (isInteractive) {
            try { dialog.focus(); } catch (e) {}
            return dialog;
        }
    } catch (ex) { /* ignore */ }

    cancelDomEvent(event);
    console.log("Activating window", dialog);
    activeDialog = dialog;
    resizeDirection = 0;
    enableDialogDrag();
    dialog.setClickOffset(event.clientX, event.clientY);
    dialog.activate();
    return dialog;
}

var ticking = false;

/**
 * @param {number} newX
 * @param {number} hewY
 */
function handleWindowDrag(newX, hewY) {
    var dialog = activeDialog;
    if (!dialog || !dialog.clickOffset) return;
    /** @type {Position} */
    var difference = { x: newX - dialog.clickOffset.clickX, y: hewY - dialog.clickOffset.clickY };

    if (dialog.maximized) {
        if (!aeroSnap) return; 
        dialog.maximized = false;
        dialog.clickOffset.clickX /= window.innerWidth / dialog.width;
    }

	dialog.stopAnimating();

    dragAction.execute(dialog, dialog.clickOffset, difference);
    if(dialog.moveEvents && dialog.exchangeDialogMoveEvent) dialog.exchangeDialogMoveEvent(difference);
}

function disableDialogDrag() {
    if (!windowManager.isDragging) return;
    // if (flipped) return;
    dragAction.set();
    windowManager.toggleDragging(false);
    windowManager.saveState();
    if (!activeDialog) return;
    
    if (aeroSnap && activeDialog.y <= 0)
        activeDialog.maximize();
    
    if (!activeDialog.moveEvents) return;

    var func = activeDialog.exchangeDialogMouseUpEvent;
    if (func) func();
}

function enableDialogDrag() {
    windowManager.toggleDragging(true);
}

/** @param {number} [newZ]  */
function updateTopZ(newZ) {
    if (newZ) if (newZ > topZ) topZ = newZ;
    else windowManager.forEachWindow(function(dialog) { if (dialog.z > topZ) topZ = dialog.z; });
}

/** @param {*} properties */
function stringifyDialogProperties(properties){
    return JSON.stringify(properties).replace(/true/g, "yes").replace(/false/g, "no").replace(/:/g, '=').replace(/}|{|"/g, '');
}

/** @param {Element?} target */
function getDialogBody(target) { // I am specifically not using querySelector in case we want an actual HTMLElement reference instead of a node! QuerySelector may be faster but I'm not using this function in time sensitive operations like the window drag, so I prefer functionality instead. The most left is the most recent revision. I removed the deprecated ones but if I make even more changes to the design of the dialogs I'll have to clean it up again or it'll get too long. We theoretically only need one, so as soon as I rebuilt all dialogs it can be simplified to one.
    if (!target) return null;
    var body = target.getElementsByTagName("content")[1] || target.getElementsByTagName("section")[1] || target.querySelector("article") || target.getElementsByClassName("client")[0] || target.getElementsByTagName("iframe")[0] || target.getElementsByTagName("section")[1] || target.getElementsByClassName("body")[0] || target.children[2];
    return isElement(body) ? body : null;
}

function getViewboxPosition() {
	return { left: window.screenLeft, top: window.screenTop }
}

/** @param {HTMLElement | Event | null} object */
function getObjectDialog(object){ // Alternatieve methode aan recursief het evenement af te gaan zou zijn door over de elementsFromPoint stack te lopen.
    if (!object) return console.log(object);
    if (isElement(object) && ["DIALOG", "BODY", "HTML", "HEAD"].indexOf(object.tagName)!=-1 || (isElement(object) && object.classList && object.classList.contains("window"))) return object;
    else if (object instanceof Event && isElement(object.target)) return getObjectDialog(object.target);
    else if (isElement(object)) return getObjectDialog(object.parentElement);
}

/** @param {number} value */
function toPixels(value) {
    return Math.round(value) + "px"; // This is why Chrome was jiggling around! I noticed it was rounding off the positions of the contained elements separately but if we round the total prosition it aligns properly to the pixel grid! Nevermind it's sitll broken... Come on chrome! It's working a lot better and you can only notice the 1px offsets if you look closely. Firefox, Internet Explorer and Edge do not have this issue at all! Actually now this issue is completely gone, even on Chrome I see absolutely no sign of the body shifting around. Might be thanks to the 5th restructuring of the dialog body.
}

/** @param {number} value */
function toDegree(value) {
    return Math.round(value) + "deg";
}

/** @param {number} pixels */
function pixelsToCentimeters(pixels){
    return (pixels * 2.54 / 96) * (window.devicePixelRatio || 1);
}

/** @param {string} text */
function fromPixels(text){
    if (text != null) try {
        return typeof text == 'number' ? text : parseInt(text.replace("px", ''))
    } catch (ex) { console.warn("Failed to parse pixels:", ex); }
    return 0;
}

/** @param {boolean} enabled */
function toggleBlur(enabled){ // Does not work on Chrome!
    if (enabled == null) document.body.classList.toggle("blur");
    else document.body.classList.toggle("blur", enabled);
    settings.set("blur", enabled);
}

/** @param {*} exception */
function handleStorageException(exception){
    console.error(exception);
    console.warn("A problem occurred, window state saving has been disabled for this session! The stored window state will be reset in an attempt to recover from this issue.");
    console.log("If you wish to save the window state before reset, copy this and put it somewhere else:", localStorage.windowState);
    localStorage.windowState = null; 
    canSave = false;
}
/** @returns {DialogState} */
Dialog.prototype.getState = function() {
    return {
        title: this.title || this.id || "Unc",
        x: this.x,
        y: this.y,
        z: this.z,
        width: this.width || this.minHeight,
        height: this.height || this.minWidth,
        open: this.isOpen || false,
        maximized: this.maximized
    };
};

/** @param {DialogState} state */
Dialog.prototype.loadState = function(state) {
    if (state.open) this.launch();
    this.title = state.title;
    this.move(state.x, state.y); 
    this.setZ(state.z);
	this.resize(state.width, state.height);
    console.log(state.title, "window loaded width: ", state.width, state.height)
    this.toggleMaximized(state.maximized);
};

Dialog.prototype.exportDialogBodyToMetro = function() {
    if (bodyCrawler.getMetroBody()) restoreMetroBody();//return;//retrieveDialogBodyFromMetro();
    // On modern browsers we can use the new shadow DOM in combination with slots to prevent iframes from firing a load event causing it to lose its state after being moved. On IE 9 and below it does not fire a reload for iframes, this functionality is inconsistent. Other option is css.
    var metro = bodyCrawler.getMetro();
    if (metro && this.body) metroBodyOrigin = this.id, metro.appendChild(this.body);
};

Dialog.prototype.retrieveBodyFromMetro = function() {
    var metroBody = bodyCrawler.getMetroBody();
    if (!metroBody) return;
    if (this.content) this.content.appendChild(metroBody);
};

function getDialogTemplate(){
    var template = document.querySelector("template") || document.getElementById("window-template");
    if (!template ) return void console.warn("Couldn't find template!");
    var content = template;
	if (template instanceof HTMLTemplateElement) return template.content.children[0];
    return content.children ? content.children[0] : content.getElementsByClassName("window")[0];//document.querySelector("template");
}

function createDialog() {
    var container = bodyCrawler.getDialogsContainer();
    var template = getDialogTemplate();
    if (!template) return null;
    var clone = template.cloneNode(true);
    if (container && clone instanceof Element) {
        var dialogElement = container.appendChild(removeComments(clone));
        if (isElement(dialogElement)) return dialogElement;
    }
    return null;
}

/** @param {Element} element */
function removeComments(element){ // Removes the comments of an HTMLElement based object.
    element.childNodes.forEach(function (child) {
        if (child.nodeName=="#comment") element.removeChild(child);
        else if (isElement(child)) removeComments(child);
    });
    return element;
}

/**
 * @param {boolean} force
 */
function toggleCharms(force){
    var charms = document.getElementById("charms");
    return charms && charms.classList.toggle("open", force);
}

function isCharmsOpen() {
    var charms = document.getElementById("charms");
    return charms && charms.classList.contains("open");
}

/** @param {Application} application */
function injectApplication(application) {
    windowManager.loadApp(application); // The Dialog class takes care of anything passed to it and tries to compile a dialog from the given data. This can be an HTMLElement or an object with each the correct structure.
    windowManager.loadState();
}

/** @param {Application[]} arguments */
var injectApplications = WindowManager.prototype.injectApplications = function() {
    for (var i = 0; i < arguments.length; i++)
        arguments[i].forEach(windowManager.loadApp, windowManager); // Awwor notation: applications.forEach(application => windowManager.windows[demo.id] = new Dialog(application));
    windowManager.loadState();
}

/** @param {string} appId  */
WindowManager.prototype.closeApp = function(appId) {
    windowManager.windows[appId].kill();
};

/** @param {string} appId  */
function closeApp(appId) { windowManager.closeApp(appId); }

function enableMica() {
    windowManager.toggleMica(true);
}

/** @param {boolean} enabled */
WindowManager.prototype.toggleMica = function(enabled) {
    this.isMicaEnabled = true;
};

/** @param {boolean} enabled */
function toggleMica(enabled) {
    windowManager.toggleMica(enabled);
}

function removeWallpaper() {
	var wallpaper = getWallpaper();
	if (!wallpaper) return;
	while (wallpaper.firstChild) wallpaper.removeChild(wallpaper.firstChild);
	return wallpaper;
}

/**
 * @param {string} url
 * @param {string} [blurredUrl]
 * @param {()=>void | null} [onError]
 */
function applyWallpaperImage(url, blurredUrl, onError) {
    var image = document.createElement("img");
    image.onerror = function () {
        console.warn("Failed to load wallpaper image!");
		if (onError) onError();
    };

    var loadHandler = function() {
        var wallpaper = getWallpaper();
        if (!wallpaper) return;
        while (wallpaper.firstChild) wallpaper.removeChild(wallpaper.firstChild);
        wallpaper.setAttribute("data-wallpaper-src", url);
        if (typeof blurredUrl == "string") wallpaper.setAttribute("data-blurred-src", blurredUrl);
        else wallpaper.removeAttribute("data-blurred-src");
    
        wallpaper.classList.toggle("legacy-wallpaper", !supportsObjectFit);
        wallpaper.style.backgroundImage = "";
        wallpaper.appendChild(image);
    };

	image.onload = loadHandler;

    if (supportsObjectFit) {
        image.src = url;
        image.className = "wallpaper-image";
    } else {
        image.className = "wallpaper-image legacy-wallpaper-image";
        image.removeAttribute("src");
        image.style.backgroundImage = "url('" + url.replace(/'/g, "\\'") + "')";
       	loadHandler();
    }
    if (blurredUrl) image.setAttribute("blurred-src", blurredUrl);

}

// enableMica();
// initializeDialogs();
// toggleReflections(reflections);

applyWallpaperImage(
  "file:///C:/Users/Lasse/Downloads/daniil-silantev-Rl7SZ19fgRQ-unsplash.jpg",
  "file:///C:/Users/Lasse/Downloads/fox-blur.jpg"
);

var wallpaper = getWallpaper();
if (wallpaper) {
	wallpaper.ondragover = function(ev) { ev.preventDefault(); console.log ("okdi")}
	wallpaper.ondrop = function(ev) { ev.preventDefault(); }
}

window.addEventListener("unload", function(e) {
    windowManager.saveState();  
}, false);

window.addEventListener("dragover", function (e) {
    e.preventDefault();
}, false);

window.addEventListener("drop", function(e) {
  e.preventDefault();
  if (!e.dataTransfer) return;
  var files = e.dataTransfer.files;
  if (files.length > 0)
     console.log("File dropped anywhere in window:", files[0].name);
}, false);

/*\  The purpose is for this website to be functional on every browser that's less than or a decade old. I created my own polyfills for some functions that don't exist in ES5, so performance on ES6 browsers is expected to be better. Meow.
 * \  Tested and confirmed functional (can work on stuff I haven't tested too.):
 *  \  Chrome for Android Chrome targetting 36 and up.
 *   \  FireFox 115 ESR and up (should work on any version that's less than 10 years old, or at least has ES5 support (2009))
 *    \  Chromium 36 (That means Chrome, Edge Chromium, Brave, Opera, ...)
 *    /  ToDo: Test on Safari on Mac OS 10.7 Lion and 10.15 Catalina when I have time to do so. Same goes for Firefox and Chrome versions that I have installed on these systems. From the tests in Dialogs 8.1 I expect this to work fine!
 *   /  Internet Explorer 11 Trident + EdgeHTML 12-18 (Edge Legacy)
 *  /  Pale Moon 34
 * /  Safari 5+ (Windows and Mac OS X)
\*/
