
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

'use strict'; // Strict mode is required for older browsers (tested on Chrome 48, Dialogs 8.1 both destkop and Metro mode).
'use esnext'; // This enables ECMAScript 6 (ES6) on older browsers that don't have it enabled by default. This enables the use of /*let*/var and const.
'use moz';  // Enable Mozilla JS extensions for old versions of Firefox so we can use /*let*/var and /*const*/var on those too.

// Modifiable settings
var useBlur = false,
    useMica = false,
    reflections = false,
    fasterDialogTracking = true,
    canSave = true,
    IE11Booster = true,
    loadingOverlay = true,
    flipped = false,
    useTransform = true,
    updateRateLimit = false;

var supportsPointer = typeof PointerEvent !== "undefined";

if (supportsPointer) console.log("Supports pointer events!");

/**
 * @param {Element} element 
 */
function isDialog(element) {
    return element && element.classList && element.classList.contains("window");
}

/**
 * @param {string} title 
 */
function titlify(title) {
    return title.toLowerCase().split(" ").join("-");
}

function WindowManager() {
    /** @type {DialogMap} */
    this._windows = {};

    /** @type {DesktopState?} */
    this._windowStates = null;
}

/**  @typedef {{[key: string]: DialogState}} DesktopState */
/**  @typedef {{[id:string]: Dialog}} DialogMap */

Object.defineProperty(WindowManager.prototype, "windows", {
    get: function() { return this._windows; }
});

Object.defineProperty(WindowManager.prototype, "windowStates", {
    get: function() {
        if (!this._windowStates) try {
            /** @type {DesktopState} */
            var windowStates = JSON.parse(localStorage.windowState);
            this._windowStates = windowStates;
        } catch(ex) { if (ex instanceof Error) console.error(ex.message); }
        return this._windowStates;
    }
});

Object.defineProperty(WindowManager.prototype, "state", {
    get: function() {
        /** @type {DesktopState} */ 
        var state = {};
        for (var id in this.windows)
            if (this.windows[id])
                state[id] = this.windows[id].getWindowState();
        return state;
    }
});

WindowManager.prototype.saveState = function() {
    if (!loaded) return;
    console.log("Saving window state.");
    if (canSave && localStorage) try {
        localStorage.setItem("windowState", JSON.stringify(this.state));
    } catch (exception) {
        handleStorageException(exception);
    }
}

/** @param {Dialog} [dialog] */
WindowManager.prototype.loadState = function(dialog) { // TODO: Load the state from localstorage on object creation, then keep that in memory for reading and add a func like this that takes one dialog as param and only restores for that
    console.log("Loading window state.")
    if (canSave) try {
        if (!localStorage || !localStorage.windowState) return;
        var windowStates = this.windowStates;
        if (dialog) dialog.loadWindowState(windowStates[dialog.id]), updateTopZ(dialog.z);
        else {
            var fails = [];
            for (var id in windowStates) try {
                if (windowManager.windows[id] && windowStates[id])
                    windowManager.windows[id].loadWindowState(windowStates[id]);
            } catch (ex) { fails.push(ex); }
            fails.forEach(function (fail) { console.error("Failed to load a window.", fail); });
            updateTopZ();
        }
    } catch (exception) {
        handleStorageException(exception);
    } else console.error("Storage access is disabled for this session!");
}

/** @typedef {(dialog: Dialog, id: string)=>void} WindowCallback */

/** @param {WindowCallback} callback */
WindowManager.prototype.forEachWindow = function(callback) {
    for (var id in this.windows) callback(this.windows[id], id);
}

/** @param {Application} app */
WindowManager.prototype.loadApp = function(app) {
    this._windows[app.id] = new Dialog(app);
};

/** @param {boolean} enabled */
WindowManager.prototype.toggleDragging = function(enabled) {
    windowManager.forEachWindow(function(dialog) { dialog.togglePointerEvents(!enabled); });
    toggleDialogDragEventHandler(enabled);
}

function ClickOffset() {
    this.x = 0;
    this.y = 0;
    this.height = 0;
    this.width = 0;
    this.top = 0;
    this.left = 0;
    this.start = {x: 0, y: 0};
    this.stats = {
        start: 0, last: 0, positions: [new Vector], position: new Vector, lastPosition: new Vector, difference: new Vector,
        reset: function () { return this.start = Date.now(), this.last = this.start, this.position = new Vector(), this; }, // De nieuwe manier reset(){} zou moeten toegepast worden, maar I am doing it the inappropriate way for compatibility with Internet Explorer 11.
        update: function(/** @type {number}*/x, /** @type {number}*/y){
            this.last = Date.now();
            this.position.x = x, this.position.y = y;
            this.positions.push(this.position.clone());
            this.difference = (this.lastPosition = this.positions.shift()).clone().sub(this.position);
            this;return this; }
    };
};

ClickOffset.prototype.clear = function() { this.x = 0, this.y = 0; }; // Modern way: clear(){}. I am doing it the old way for compatibility. Not all browsers understand the new notation yet. Yet? I mean IE will never support it so it's not not yet it's never

/**
 * Creates an instance of a Dialog that allows the Dialog be resized and moved around.
 * @author Lasse Lauwerys
 * @param {HTMLElement | Application} object This is a dialog element from the HTML structure, or an object that defines the properties of the window.
 * @param {boolean} [create]
 * @property {number} xe
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
    
    this.minWidth = 100;
    this.minHeight = 200;
    this._mica = useMica;
    
    if (!object) return;
    if (!create) create = false;

    /** @type {HTMLElement?} */
    this.target = null;
    var id = object.id;

    /** @type {Application?} */
    this.application = null;
    if (!(object instanceof HTMLElement))
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

    // This adds application shortcuts to the app drawer, which currently rests on the desktop. I will make another drawer for mobile and make a pop-up drawer from the dock with the option to pin apps to it. I probably won't have enough time to implement an in-browser file manager, the localStorage API is limited to 5-10MB and using persistent storage requires browser specific APIs that don't work consistently yet.
    
    var applist = document.getElementById("applist");
    if (applist) applist.appendChild(this.createOpenButton());
    
    var metroapplist = document.getElementById("metroapplist");
    if (metroapplist) metroapplist.appendChild(this.createOpenButton());
    if (create || object instanceof HTMLElement) this.initWithObject(object);
}

/**
 * @param {HTMLElement | Application} object
 */
Dialog.prototype.initWithObject = function (object) {
    if (!object) return;

    if (object instanceof HTMLElement) {
        if (!isDialog(object)) return console.warn("This is not a dialog element");
        this.target = object;
        if (this.target.parentElement && this.target.parentElement.nodeName === "TEMPLATE") return;
    } else {
        this.application = object;
        // this.closeable = true;
        var newDialog = createDialog();
        this.target = newDialog;
        if (object.classes && typeof object.classes === 'object'){
            object.classes.forEach(function (someclass) { this.target && this.target.classList.add(someclass); }, this); // We can't use class since it's a keyword!!
        }
        // this.src = object.src;
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

    this.minWidth = 100;
    this.minHeight = 200;
    
    this.originalBody = this.body;

    if(!this.scroll && this.body) this.body.style.overflow = "hidden";

    // This adds application shortcuts to the app drawer, which currently rests on the desktop. I will make another drawer for mobile and make a pop-up drawer from the dock with the option to pin apps to it. I probably won't have enough time to implement an in-browser file manager, the localStorage API is limited to 5-10MB and using persistent storage requires browser specific APIs that don't work consistently yet.
    var applist = document.getElementById("applist");
    if (applist) applist.appendChild(this.createOpenButton());
    var metroapplist = document.getElementById("metroapplist");
    if (metroapplist) metroapplist.appendChild(this.createOpenButton());

    this.toggleCloseButton(true);
    this.toggleFullButton(true);
    if (this.verifyEjectCapability()) this.toggleEjectButton(true);

    this.exchangeDialogMouseUpEvent = this.messageFrame.bind(this, "mouseUp", { difference: new Vector });

    var self = this;
    /** @param {Position} difference */
    this.exchangeDialogMoveEvent = function(difference) { // Async is not supported in IE11?!? I chose some async since we don't need the return value and I need the window move to be as fast as possible. The next best option is a service worker!!
        if (difference && self.clickOffset) this.messageFrame("windowMove", self.clickOffset.stats.update(difference.x, difference.y));
    };

    // if (object.body) this.body.appendChild(object.body);

    var target = this.target;
    var body = getDialogBody(target);
    if (target && body) {
    var borderSection = target.getElementsByTagName("section")[0];

    if(borderSection && !this.fixed) {
        for (var index = 0; index < 8; index++) {
            var div = document.createElement("div");
            div.draggable = false, div.id = String(index + 1);
            /** @type {(this: GlobalEventHandlers, ev: PointerEvent | MouseEvent) => any} */
            var pointerDown = function (ev) {
                if (ev.target && ev.target instanceof HTMLElement) dragAction.set(Number(ev.target.id));
            }; // You can also put index + 1 in here instead for optimal efficiency and minimalism, but Internet Explorer is a very stubborn browser and does not instantiate the index variable but keeps one in memory resulting in resize direction being 9. Despite this it uses very little memory compared to Firefox and Chrome?
            if (supportsPointer) div.onpointerdown = pointerDown;
            else div.onmousedown = pointerDown;
            target.appendChild(div);
        }
    }

    body.addEventListener("load", function () { try { self.verifyEjectCapability(); } catch (exception) { if (target) target.getElementsByTagName("button")[0].style.display = "none"; }});

    if (supportsPointer) target.addEventListener("pointerdown", function (ev) { windowActivationEvent(ev, self) });
    else target.addEventListener("mousedown", function (ev) { windowActivationEvent(ev, self) });
    target.getElementsByTagName("button")[windowButtons.eject].addEventListener("click", function(event) {
        if (!target) return;
        var rect = target.getClientRects()[0];
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
            top: rect.top + viewboxPosition.top
        }

        if (self.href) self._popupWindow = window.open(self.href, self.title, stringifyDialogProperties(propeties));
        self.quit();
    });
    
    var buttons = target.getElementsByTagName("button");
    buttons[windowButtons.close].addEventListener("click", function () {
        self.close();
    }.bind(self));
    buttons[windowButtons.full].addEventListener("click", function(){self.toggleFullScreen()});
    this.close();
}

    if (this.id) windowManager.windows[this.id] = this;
}

/**
 * @param {number} [a] 
 * @param {number} [b] 
 */
function max(a, b) {
    if (a || 0 > (b || 0)) return a || 0;
    else return b|| 0;
}

/**
 * @param {number} a 
 * @param {number} b 
 */
function min(a, b) {
    if (a < b) return a;
    else return b;
}

/**
 * @param {HTMLElement} element 
 * @param {number} x 
 * @param {number} y 
 */
function translateElement(element, x, y) {
    element.style.transform = "translate(" + toPixels(x) + "," + toPixels(y) + ")";
    element.style.webkitTransform = "translate(" + toPixels(x) + "," + toPixels(y) + ")";
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
    get: function() { return this.target && this.target.hasAttribute("open"); },
    set: function(force) { if (this.target) this.target.toggleAttribute("open", force), this.activate(); }
});
Object.defineProperty(Dialog.prototype, "frame", {
    get: function() { return this.target && this.target.getElementsByTagName("iframe")[0] || this.body && this.body.appendChild(document.createElement("iframe")); },
});
Object.defineProperty(Dialog.prototype, "src", {
    get: function() { return this._src; },
    set: function(url) {
        var frame = this.frame;
        if (frame) frame.src = url;
    }
});
Object.defineProperty(Dialog.prototype, "body", {
    get: function() { return this.content ? (this.content.children[1] instanceof HTMLElement ? this.content.children[1] : null) : null; },
});
Object.defineProperty(Dialog.prototype, "head", {
    get: function() { return  this.target ?this.target.getElementsByTagName("header")[0] : null; },
});

Object.defineProperty(Dialog.prototype, "mica", {
    get: function() { return this._mica; },
    set: function(mica) {
        this._mica = mica;
        if (mica) this.injectMica();
        else this.removeMica();
    }
});

Object.defineProperty(Dialog.prototype, "x", {
    get: function() { return this._x; },
    /** @param {number} x */
    set: function(x) { if (typeof x == "number") this.move(x, this._y); }
}); 

Object.defineProperty(Dialog.prototype, "y", {
    /** @returns {number} */
    get: function() { return this._y; },
    set: function(y) { if (typeof y == "number") this.move(this._x, y); }
});

Object.defineProperty(Dialog.prototype, "z", {
    get: function() { return this._z; },
    set: function(z) { if (typeof z == "number") { this._z = z; if (this.target instanceof HTMLElement) this.target.style.zIndex = String(z); } }
});
    
Object.defineProperty(Dialog.prototype, "width", {
    get: function() { return this._width; },
    set: function(width) {
        if (typeof width !== "number" || !this.target) return;

        this.target.style.width = toPixels(this._width = max(width, this.minWidth));
        this._isMinWidth = this._width === this.minWidth;
    }
});

Object.defineProperty(Dialog.prototype, "height", {
    get: function() { return this._height; },
    set: function(height) { if (typeof height == "number" && this.target) this.target.style.height = toPixels(this._height = max(height, this.minHeight)); this._isMinHeight = this._height === this.minHeight }
});


Object.defineProperty(Dialog.prototype, "top", {
    get: function() { return this.y; },
    set: function(top) {
        var difference  = this.y - top;
        if (difference + this.height < this.minHeight) this.top = this.bottom - this.minHeight;
        else {
            this.y = top;
            this.height += difference;
        }
    }
});

Object.defineProperty(Dialog.prototype, "left", {
    get: function() { return this.x; },
    set: function(left) {
        var difference  = this.x - left;
        if (difference + this.width < this.minWidth) this.left = this.right - this.minWidth;
        else {
            this.x = left;
            this.width += difference;
        }
    }
});

Object.defineProperty(Dialog.prototype, "right", {
    get: function() { return this.x + this.width; },
    set: function(right) { this.width = right - this.x; }
});

Object.defineProperty(Dialog.prototype, "bottom", {
    get: function() { return this.y + this.height; },
    set: function(bottom) { this.height = bottom - this.y; }
});

Object.defineProperty(Dialog.prototype, "isMinWidth", { get: function() { return this._isMinWidth; }});
Object.defineProperty(Dialog.prototype, "isMinHeight", { get: function() { return this._isMinHeight; } });

Object.defineProperty(Dialog.prototype, "title", {
    get: function() { return this._title; },
    set: function(title) {
        this.setTitle(title);
    }
});

/** @param {string} title */
Dialog.prototype.setTitle = function(title) {
    this._title = title;
    var titleElement = this.getTitleElement();
    if (titleElement) titleElement.innerHTML = title;
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
        var content = this.target.getElementsByTagName("content")[0];
        if (content instanceof HTMLElement) return content;
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
            if (!this.target) return;
            var clip = this.target.getElementsByClassName("backdrop-clip")[0].children[0];
            if (clip instanceof HTMLElement) return clip;
        } catch(ex) { if (ex instanceof Error) console.log(ex.message) }
        return null;
    }
});

/** @type {Dialog?} */
var focusedDialog = null;
Dialog.prototype.focus = function() {
    if (focusedDialog !== null && focusedDialog.target)
        focusedDialog.target.removeAttribute("focus");
    if (this.target) this.target.setAttribute("focus", String(true));
    focusedDialog = this;
}
Dialog.prototype.activate = function() {
    this.focus();
    return this.z = topZ++, this.messageFrame(LVMessenger.types.open), activeDialogId = this.id, activeDialog = this, swapMetroBody();
}
Dialog.prototype.getTitleElement = function() { return this.head && this.head.querySelector("h1"); };
/** @param {boolean} force */
Dialog.prototype.toggleTitlebar = function(force) { return this.head && !this.head.classList.toggle("hidden", typeof force !== 'undefined' ? !force : undefined); };
Dialog.prototype.open = function() { return this.isOpen = true, windowManager.saveState(), this.isOpen; }; // Open, save, return if it's opened or not
Dialog.prototype.close = function() { return this.isOpen = false, windowManager.saveState(), this.isOpen; };
Dialog.prototype.getInnerRect = function() { if (this.target) return { top: this.target.offsetTop, left: this.target.offsetLeft, right: this.target.offsetLeft + this.target.offsetWidth, bottom: this.target.offsetTop + this.target.offsetHeight, width: this.target.offsetWidth, height: this.target.offsetHeight }; }, // This builds a rect without extra function calls and includes the dimension offsets caused by css transformations. This allows us to actually move the windows correctly WHILE the animation is playing. Try it out if you think you're fast enough (or change the animation speed)
/** @param {number} index */
Dialog.prototype.getRect = function(index) { if (this.target) return index == null ? this.target.getBoundingClientRect() : this.target.getClientRects()[index]; }
/** @param {number} index */
Dialog.prototype.getButton = function(index) { return this.head && this.head.getElementsByTagName("button")[index]; }
Dialog.prototype.createOpenButton = function() { return this.buttons.unshift(document.createElement("button")), this.buttons[0].innerText = this.title || "", this.buttons[0].onclick = this.launch.bind(this), this.buttons[0] }
/**
 * @param {number} x 
 * @param {number} y 
 */
Dialog.prototype.setClickOffset = function(x, y) {
    var rect = this.getRect();
    if (!this.clickOffset || !rect) return;
    return this.clickOffset.x = x, this.clickOffset.y = y, this.clickOffset.height = window.height || rect.height, this.clickOffset.width = window.width || rect.width, this.clickOffset.top = rect.top, this.clickOffset.left = rect.left, this.clickOffset.stats.reset();
}
Dialog.prototype.verifyEjectCapability = function() { return Boolean(this.href); };
Object.defineProperty(Dialog.prototype, "href", { get: function () {
    if (!this.application) return null;
    return this.application.src;
}});
/** @param {boolean} enable */
Dialog.prototype.togglePointerEvents = function(enable) {
    if (enable == null && this.target) enable = this.target.style.pointerEvents == "none";
    var events = enable ? "auto" : "none";
    if (this.target) this.target.style.pointerEvents = events;
    if (this.originalBody) this.originalBody.style.pointerEvents = events;
    if (this.frame) this.frame.style.pointerEvents = events;
    return events;
    // return (this.frame || this.getFrame()).style.pointerEvents = enable ? "auto" : "none";
}
/**
 * @param {number} buttonId 
 * @param {boolean} [enable]
 */
Dialog.prototype.toggleButton = function(buttonId, enable) { var button = this.getButton(buttonId); return button && button.toggleAttribute("disabled", !enable); };
Dialog.prototype.clearClickOffset = function() { this.clickOffset && this.clickOffset.clear(); };
/** @param {boolean} [enable] */
Dialog.prototype.toggleFullScreen = function(enable) { if (this.target) this.target.toggleAttribute("full", enable); };
/** @param {boolean} [enable] */
Dialog.prototype.toggleCloseButton = function(enable) { this.toggleButton(windowButtons.close, enable); };
/** @param {boolean} [enable] */
Dialog.prototype.toggleEjectButton = function(enable) { this.toggleButton(windowButtons.eject, enable); };
/** @param {boolean} [enable] */
Dialog.prototype.toggleFullButton = function(enable) { this.toggleButton(windowButtons.full, enable); };
/**
 * @param {MessageType | string} type 
 * @param {*} [message] 
 */
Dialog.prototype.messageFrame = function(type, message) { if (this.frame) LVMessenger.broadcastToChild(type, message, this.frame); };
/**
 * @param {number?} [x]
 * @param {number?} [y]
 */
Dialog.prototype.move = function(x, y) {
    if (typeof x === "undefined" || x === null) x = this.x;
    if (typeof y === "undefined" || y === null) y = this.y;
    this._x = max(typeof x === "undefined" || x === null ? this.x : x, 0),
    this._y = max(y, 0);
    if (!this.target) return;
    if (useTransform) {
        this.target.style.left = "0px";
        this.target.style.top = "0px";
        translateElement(this.target, this._x, this._y);
    } else {
        this.target.style.transform = "none";
        this.target.style.left = toPixels(this._x);
        this.target.style.top = toPixels(this._y);
    }

    if (this.mica && useTransform) {
        var backdrop = this.target.getElementsByClassName("backdrop-clip")[0].firstChild;
        var wallpaperP = document.getElementById("wallpaper");
        if (!wallpaperP) return;
        var wallpaper = wallpaperP.children[0];
        if (!(backdrop instanceof HTMLElement) || !wallpaper) return;
        translateElement(backdrop, -this._x, -this._y);
        
        backdrop.style.width = toPixels(wallpaper.clientWidth);
        backdrop.style.height = toPixels(wallpaper.clientHeight);
    }
}
/**
 * @param {number} width 
 * @param {number} height 
 */
Dialog.prototype.resize = function(width, height) { if (this.body) this.body.style.boxSizing = "border-box", this.width = width, this.height = height; }
/**
 * @param {number} width 
 * @param {number} height 
 */
Dialog.prototype.resizeBody = function(width, height) { if (this.body && this.target) this.body.style.boxSizing = "content-box", this.body.style.width = toPixels(this.width = width), this.body.style.height = toPixels(this.height = height), this.target.style.width = "", this.target.style.height = ""; }
/** @param {string} url */
Dialog.prototype.openUrl = function(url) {
    if (!this.frame) return;
    this.frame.src = url;
    this.launch();
};

Dialog.prototype.quit = function() {
    if (this.closeable) {
        if (this.target && this.target.parentElement) this.target.parentElement.removeChild(this.target);
        this.target = null;
    }
    else this.close();
};

Dialog.prototype.launch = function() {
    if (!this.target && this.application) this.initWithObject(this.application);
    if (this.mica) this.injectMica();

    this.open();
};

Dialog.prototype.relaunch = function() {
    this.quit();
    this.launch();
};

function getWallpaper() {
    return document.getElementById("wallpaper");
}

Dialog.prototype.injectMica = function() {
    try {
        if (!useTransform) return;
        if (this.micaElement || !this.target) return;
        var wallpaper = document.getElementById("wallpaper");
        if (!wallpaper) return;
        var image = wallpaper.children[0].cloneNode(true);
        if (image instanceof HTMLImageElement) {
            var blurredUrl = image.getAttribute("blurred-src");
            if (blurredUrl) {
                console.log("Found blurred version: " + blurredUrl);
                image.src = blurredUrl;
            }
        }
        var clip = this.target.getElementsByClassName("backdrop-clip")[0];
        if (!clip) return;
        clip.appendChild(image);
        this.move();
    } catch(ex) { console.warn(ex); }
};

Dialog.prototype.removeMica = function() {
    var clip = this.target.getElementsByClassName("backdrop-clip")[0];
    if (!clip) return;
    clip.removeChild(clip.children[0]);
};

/** @typedef {(dialog: Dialog, offset: ClickOffset, difference: Position)=>void} DragFunction */

// This was another test to check performance. It's basically an older version of the drag calculator which updates the positions at average 0.1-0.5ms in Chrome on my laptop. This method turns out to be faster for IE11 than it is for Chrome on the same computer. I left it in for performance reasons because it works so well, this lets us boost window dragging for older browsers.
function DragAction() { // This looks less elegant than checking on mouse move but if we simply define the function in advance we save quite a lot of performance by doing the resize method calculations in advance instead on every mouse move tick. I also intentionally split the code up again so we do have duplicate code but in this case it's far more efficient to do 1 function call with 0 if statements than doing 16 function calls with 3 * 6 + 2 if statements for each direction on every mousemove event! Even the visually pleasing but technically sluggish method works relatively smoothly on modern browsers, it gets quite horrible once reflections and blur are enabled, these effects are done by native code in the browser and we can't optimise that so I did my best to make this as efficient as I could come up with. Performance is absolutely necessary because we want the window dragging to feel instantaneous, lag is absolutely not tolerated even on slow hardware and deprecated browsers! Rawr.
    /** @type {DragFunction} */
    this.execute = function(){};
    /** @type {DragFunction[]} */
    this.resizeFunctions = [
        function(dialog, offset, difference){ dialog.move(offset.left + difference.x, offset.top + difference.y); }, // Move
        function(dialog, offset, difference){ dialog.top = offset.top + difference.y }, // Top
        function(dialog, offset, difference){ dialog.width = offset.width + difference.x }, // Right
        function(dialog, offset, difference){ dialog.height = offset.height + difference.y }, // Bottom
        function(dialog, offset, difference){ dialog.left = offset.left + difference.x; }, // Left
        function(dialog, offset, difference){ dialog.top = offset.top + difference.y, dialog.left = offset.left + difference.x; }, // Top Left
        function(dialog, offset, difference){ dialog.width = offset.width + difference.x, dialog.height = offset.height - difference.y, dialog.y = offset.top + difference.y },// Top right
        function(dialog, offset, difference){ dialog.height = offset.height + difference.y, dialog.width = offset.width + difference.x }, // Bottom right
        function(dialog, offset, difference){ dialog.x = offset.left + difference.x, dialog.width = offset.width - difference.x, dialog.height = offset.height + difference.y }, // Bottom cleft?
    ];
}

/** @param {number} [direction] */
DragAction.prototype.set = function(direction) { this.execute = this.resizeFunctions[direction || 0] || function(){console.log("bleed mself sdry")} };

/** @param {HTMLDocument} document */
function DocumentCrawler(document){
    this.document = document;
}

DocumentCrawler.prototype = {
    getMetro: function(){ return this.document.getElementById("metrobody"); },
    getMetroBody: function(){ var metro = this.getMetro(); return metro && metro.firstChild; },
    getAllDialogs: function(){ return this.document.getElementsByClassName("window") },
    getDialogsContainer: function(){ return this.document.getElementById("windows") },
    get overlay(){ return document.getElementById("overlay"); }, // I don't know why I didn't use getters to start with.
    get charms(){ return document.getElementById("charms"); },
    get settings(){ return document.getElementById("settings"); },
    get theme(){ return document.getElementById("theme"); },
    get desktop(){ return document.getElementById("desktop"); },
    get applist(){ return document.getElementById("applist"); },
}

// Setting up the global variables after defining the classes to avoid undefined prototypes!
var windowManager = new WindowManager;
var bodyCrawler = new DocumentCrawler(document);
var dragAction = new DragAction;
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
 * 
 * @param {MessageType} type 
 * @param {any} data 
 * @param {string} source 
 */
function messageReceived(type, data, source){ // I have yet to make a wrapper function that takes care of the types and data parsing for ease of use by another user who doesn't understand what I'm doing here, it needs to be done manually by me for now!
    var types = LVMessenger.types;
    if (source) {
        if (type === types.windowSize) windowManager.windows[source].resizeBody(data.width, data.height); // If our dialog gives us a specific size, we act accordingly and give it what it wants! We swith the window size from being based on the non-client area size, and we make the non-client area wrap around the client area, fully giving sizing control to the client. This way our system can suffice the client's demands.
        switch (type) {
            case types.launchOverlay:
                if (!bodyCrawler.overlay) break;
                bodyCrawler.overlay.ontransitionend = function () {
                    var dialog = windowManager.windows[source];
                    dialog.messageFrame(LVMessenger.types.prepareToLaunchOverlay);
                    if (dialog.frame) {
                        var oriurl = new URL(dialog.frame.src);
                        oriurl.searchParams.set("fullscreen", String(true));
                        dialog.frame.src = oriurl.href;
                    }
                    if (!bodyCrawler.overlay) return;
                    bodyCrawler.overlay.ontransitionend = null;
                    bodyCrawler.overlay.requestFullscreen();
                    if (dialog.body) bodyCrawler.overlay.appendChild(dialog.body);
                    window.setTimeout(bodyCrawler.overlay.classList.add.bind(bodyCrawler.overlay.classList, "shown"), 500);
                };
                bodyCrawler.overlay.classList.toggle("open");
                break;
            case types.readyToLaunchOverlay:
                if (!bodyCrawler.overlay) break;
                var dialog = windowManager.windows[source];
                if (dialog.body) bodyCrawler.overlay.appendChild(dialog.body);
                window.setTimeout(bodyCrawler.overlay.classList.add.bind(bodyCrawler.overlay.classList, "shown"), 500);
                break;
        }
        console.log("Received message " + type);
    }
}

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
    bodyCrawler.desktop.toggleAttribute("flipped", enable); // Deprecated, I am switching transferring this attribute to a class.
    flipHandler(bodyCrawler.desktop.classList.toggle("flipped", enable));
}

/**
 * @param {boolean} enabled 
 */
function flipHandler(enabled){
    toggleCharms(false);
    swapMetroBody();
    return flipped = enabled;
}

LVMessenger.receive(messageReceived);

var toggleOverlay = bodyCrawler.overlay ? bodyCrawler.overlay.classList.toggle.bind(bodyCrawler.overlay.classList, "open") : function() { console.warn("Overlay wasn't found on initialization."); }; // The force attribute gets automatically forwarded!

toggleOverlay(loadingOverlay);

var desktopElement = document.getElementById("desktop");

if (loadingOverlay && desktopElement) desktopElement.ontransitionend = checkForFlip;
function checkForFlip() {

    if (!loaded) {
        //I'll s'
        console.log("th I'll set the timeoutrat");
        clearTimeout(timeout); // I don't know why it works with the timeout set to 0 unless if the 3 repeated animation events actually get called in less than 1ms. I guess it's handy since we want it to load as fast as possible;
        timeout = setTimeout(function () {
            toggleOverlay(!(!loaded ? (loaded = true) : false));
            updateBlurState();
        }, 500);
    }

    if (false && window.matchMedia('only screen and (max-width: 300px), (pointer:none), (pointer:coarse)').matches) {
        console.log("Switching to Mobile mode...");
        if (!flipped) {
            flipHandler(true);
            activeDialogToMetro();
        }
    } else if (flipped) {
        console.log("Switching to Desktop mode...");
        flipHandler(false);
        restoreMetroBody();
    }
};

window.onresize = checkForFlip;

function initializeDialogs() {
    if (typeof onpointerup !== "undefined") document.onpointerup = disableDialogDrag;
    else document.onmouseup = disableDialogDrag;
    
    dragAction.set(0);
    var dialogs = bodyCrawler.getAllDialogs();
    Array.from(dialogs).forEach(function(dialog) {
        if (!(dialog instanceof HTMLElement)) return;
        windowManager.windows[dialog.id] = new Dialog(dialog); 
    });
    //flip();
    checkForFlip();
    windowManager.loadState();
}

// Normally we use /*const*/var in for in loops!
// I am using /*let*/var for Internet Explorer 11 and other old browsers that create one instance of the looping variable and assign a new value to the same variable instead of creating a new one every time. This can cause problems if we use /*const*/var because you can't assign to a const! It also limits us from using that variable in the loop for "higher order" functions, also known as delegates or callbacks, since the same variable gets modified on these browsers.

/**
 * Activates the window on which the provided event was fired.
 * @param {MouseEvent | PointerEvent} event 
 * @param {Dialog} dialog 
 * @returns 
 */
function windowActivationEvent(event, dialog) {
    console.log("Activating window", dialog);
    activeDialogId = dialog.id;
    if (!activeDialogId) return;
    activeDialog = dialog;
    resizeDirection = 0;
    enableDialogDrag();
    activeDialog.setClickOffset(event.clientX, event.clientY);
    activeDialog.activate();
    return dialog;
}

var ticking = false;

/**
 * @param {number} newX 
 * @param {number} hewY 
 */
function handleWindowDrag(newX, hewY) {
    if (!activeDialogId) return;
    var dialog = activeDialog;
    if (!dialog.clickOffset) return;
    /** @type {Position} */
    var difference = { x: newX - dialog.clickOffset.x, y: hewY - dialog.clickOffset.y };

    dragAction.execute(dialog, dialog.clickOffset, difference);
    if(dialog.moveEvents && dialog.exchangeDialogMoveEvent) dialog.exchangeDialogMoveEvent(difference);
}

/**
 * @param {PointerEvent | MouseEvent} event 
 */
function windowDragEvent(event){
    try {
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

/**
 * @param {boolean} enable 
 */
function toggleDialogDragEventHandler(enable) {
    if (enable) document.addEventListener(supportsPointer ? "pointermove" : "mousemove", windowDragEvent), console.log("Starting drag");
    else document.removeEventListener(supportsPointer ? "pointermove" : "mousemove", windowDragEvent), console.log("Stoppinge drag");
}

function disableDialogDrag() {
    // if (flipped) return;
    toggleDialogDragEventHandler(false);
    dragAction.set();
    windowManager.toggleDragging(false);
    windowManager.saveState();
    if (!(activeDialog && activeDialog.moveEvents)) return;
    
    var func = activeDialog.exchangeDialogMouseUpEvent;
    if (func) func();
}

function enableDialogDrag(){
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
    return body instanceof HTMLElement ? body : null;
}

function getViewboxPosition(){
    return { left: window.screenLeft, top: window.screenTop }
}

/** @param {HTMLElement | Event | null} object */
function getObjectDialog(object){ // Alternatieve methode aan recursief het evenement af te gaan zou zijn door over de elementsFromPoint stack te lopen.
    if (!object) return console.log(object);
    if (object instanceof HTMLElement && ["DIALOG", "BODY", "HTML", "HEAD"].indexOf(object.tagName)!=-1 || (object instanceof HTMLElement && object.classList && object.classList.contains("window"))) return object;
    else if (object instanceof Event && object.target instanceof HTMLElement) return getObjectDialog(object.target);
    else if (object instanceof HTMLElement) return getObjectDialog(object.parentElement);
}

/** @param {number} value */
function toPixels(value) {
    return Math.round(value) + "px"; // This is why Chrome was jiggling around! I noticed it was rounding off the positions of the contained elements separately but if we round the total prosition it aligns properly to the pixel grid! Nevermind it's sitll broken... Come on chrome! It's working a lot better and you can only notice the 1px offsets if you look closely. Firefox, Internet Explorer and Edge do not have this issue at all! Actually now this issue is completely gone, even on Chrome I see absolutely no sign of the body shifting around. Might be thanks to the 5th restructuring of the dialog body.
}

/** @param {number} pixels */
function pixelsToCentimeters(pixels){
    return (pixels * 2.54 / 96) * (window.devicePixelRatio || 1);
}

/** @param {string} text */
function fromPixels(text){
    if (text != null) try {
        return typeof text === 'number' ? text : parseInt(text.replace("px", ''))
    } catch (ex) {
        console.warn("Failed to parse pixels:", ex);
        return 0;
    }
    else return 0;
}

/** @param {boolean} enabled */
function toggleBlur(enabled){ // Does not work on Chrome!
    if (enabled == null) document.body.toggleAttribute("blur");
    else document.body.toggleAttribute("blur", enabled);
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

Dialog.prototype.getWindowState = function() {
    /** @type {DialogState} */
    var state = {
        title: this.title || this.id || "uhm what",
        x: this.x,
        y: this.y || 0,
        z: this.z || 0,
        width: this.width || this.minHeight,
        height: this.height || this.minWidth,
        open: this.isOpen || false,
    }
    return state;
}

/** @param {DialogState} state */
Dialog.prototype.loadWindowState = function(state) {
    this.title = state.title;
    this.x = state.x;   
    this.y = state.y;
    this.z = state.z;
    this.width = state.width;   
    this.height = state.height;
    if (state.open) this.launch();
}

Dialog.prototype.exportDialogBodyToMetro = function() {
    if (bodyCrawler.getMetroBody()) restoreMetroBody();//return;//retrieveDialogBodyFromMetro();
    // On modern browsers we can use the new shadow DOM in combination with slots to prevent iframes from firing a load event causing it to lose its state after being moved. On IE 9 and below it does not fire a reload for iframes, this functionality is inconsistent. Other option is css.
    var metro = bodyCrawler.getMetro();
    if (metro && this.body) metroBodyOrigin = this.id, metro.appendChild(this.body);
}

Dialog.prototype.retrieveBodyFromMetro = function() {
    var metroBody = bodyCrawler.getMetroBody();
    if (!metroBody) return;
    if (this.content) this.content.appendChild(metroBody);
}

function getDialogTemplate(){
    var template = document.querySelector("template");
    if (!template) return null;
    var content = template.content;
    return (content || document.getElementsByTagName("template")[0]).children[0];//document.querySelector("template");
}

function createDialog() {
    var container = bodyCrawler.getDialogsContainer();
    var template = getDialogTemplate();
    if (!template) return null;
    var clone = template.cloneNode(true);
    if (container && clone instanceof Element) {
        var dialogElement = container.appendChild(removeComments(clone));
        if (dialogElement instanceof HTMLElement) return dialogElement;
    }
    return null;
}

/** @param {Element} element */
function removeComments(element){ // Removes the comments of an HTMLElement based object.
    element.childNodes.forEach(function (child) {
        if (child.nodeName=="#comment") element.removeChild(child);
        else if (child instanceof HTMLElement) removeComments(child);
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

/** @param {...Application[]} arguments */
WindowManager.prototype.injectApps = function() {

}

/** @param {Application} application */
function injectApplication(application) {
    windowManager.loadApp(application); // The Dialog class takes care of anything passed to it and tries to compile a dialog from the given data. This can be an HTMLElement or an object with each the correct structure.
    windowManager.loadState();
}



/** @param {...Application[]} arguments */
function injectApplications() {
    for (let i = 0; i < arguments.length; i++)
        arguments[i].forEach(windowManager.loadApp); // Awwor notation: applications.forEach(application => windowManager.windows[demo.id] = new Dialog(application));
    windowManager.loadState();
}

/** @param {string} appId  */
function closeApp(appId) {
    var element = windowManager.windows[appId].target;
    if (element && element.parentElement)
        element.parentElement.removeChild(element);
}

function enableMica() {
    var wallpaper = getWallpaper();
    window.addEventListener("resize", function(ev) {
        for (var id in windowManager.windows) {
            if (!(windowManager.windows.hasOwnProperty(id))) continue;
            var dialog = windowManager.windows[id];
            if (dialog) dialog.resize(dialog.width || dialog.minWidth, dialog.height || dialog.minHeight); // TODO: Why does it say width can be null?? it should return minheight probably always if undefned really but it cant reraly be that righte
        }
    });
}

/**
 * @param {string} url 
 * @param {string} blurredUrl 
 */
function applyWallpaperImage(url, blurredUrl) {
    var image = document.createElement("img");
    image.src = url;
    if (blurredUrl) image.setAttribute("blurred-src", blurredUrl);

    var wallpaper = getWallpaper();
    if (!wallpaper) return;
    Array.from(wallpaper.children).forEach(function(wallpaperChild) {
        if (wallpaper) wallpaper.removeChild(wallpaperChild);
    });
    wallpaper.appendChild(image);
}

enableMica();

initializeDialogs();
toggleReflections(reflections);

applyWallpaperImage("file:///C:/Users/Lasse/Downloads/daniil-silantev-Rl7SZ19fgRQ-unsplash.jpg", "file:///C:/Users/Lasse/Downloads/fox-blur.jpg");

var wallpaper = getWallpaper();
if (wallpaper) {
    wallpaper.ondragover = function(ev) { ev.preventDefault(); console.log ("okdi")}
    wallpaper.ondrop = function(ev) { ev.preventDefault(); }
}

window.addEventListener("dragover", function(e) {
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
