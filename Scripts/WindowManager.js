
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

/*let*/var // Defining the default settings as /*let*/var so we can modify them.
    blur = false,
    reflections = true,
    fasterDialogTracking = true,
    canSave = true,
    IE11Booster = true,
    loadingOverlay = true,
    flipped = false,
    useTransform = true;

/*const*/var supportsPointer = typeof PointerEvent !== "undefined";

if (supportsPointer) console.log("Supports pointer events!");

/**
 * @param {HTMLElement} element 
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

/**
 * @typedef {import('./ProvisionedApps.js').Application} Application
 */

/**
 * Creates an instance of a Dialog that allows the Dialog be resized and moved around.
 * @author Lasse Lauwerys
 * @param {HTMLElement | Application} object This is a dialog element from the HTML structure, or an object that defines the properties of the window.
 */
function Dialog(object) {
    
    this._x = 0;
    this._y = 0;
    this._width = 0;
    this._height = 0;
    this._isMinWidth = false;
    this._isMinHeight = false;

    this.z = 0;
    this.minWidth = 100;
    this.minHeight = 200;

    if (!object) return;
    /*const*/var dialog = this;

    /** @type {HTMLElement} */
    this.target = null;

    if (object instanceof HTMLElement) {
        if (!isDialog(object)) return console.warn("This is not a dialog element");
        this.target = object;
        console.log(this.target.parentElement.nodeName === "TEMPLATE");
        if (this.target.parentElement.nodeName === "TEMPLATE") return;
    } else {
        /** @type {Application} */
        this.application = object;
    }
    
    this._title = object.title || this.getTitleElement().innerText;
    this._id = object.id || this.id || this.title;
    this.buttons = [];
    this.originalBody = this.body;
    this.clickOffset = {
        x: 0, y: 0, height: 0, width: 0, start: {x: 0, y: 0}, stats: {
            start: 0, last: 0, positions: [new Vector()], position: new Vector(), lastPosition: new Vector(), difference: new Vector(),
            reset: function () { return this.start = Date.now(), this.last = this.start, this.position = new Vector(), this; }, // De nieuwe manier reset(){} zou moeten toegepast worden, maar I am doing it the inappropriate way for compatibility with Internet Explorer 11.
            update: function(x, y){
                this.last = Date.now();
                this.position.x = x, this.position.y = y;
                this.positions.push(this.position.clone());
                this.difference = (this.lastPosition = this.positions.shift()).clone().sub(this.position);
                this;return this; }
        },
        clear: function () { this.x = 0, this.y = 0; } // Modern way: clear(){}. I am doing it the old way for compatibility. Not all browsers understand the new notation yet. Yet? I mean IE will never support it so it's not not yet it's never
    };

    if(!this.scroll && this.body) this.body.style.overflow = "hidden";

    // This adds application shortcuts to the app drawer, which currently rests on the desktop. I will make another drawer for mobile and make a pop-up drawer from the dock with the option to pin apps to it. I probably won't have enough time to implement an in-browser file manager, the localStorage API is limited to 5-10MB and using persistent storage requires browser specific APIs that don't work consistently yet.
    document.getElementById("applist").appendChild(this.createOpenButton());
    document.getElementById("metroapplist").appendChild(this.createOpenButton());
    this.initWithObject(object);
}

Dialog.prototype.initWithObject = function (object) {
    if (!object) return;
    /*const*/var dialog = this;

    if (object instanceof HTMLElement) {
        if (!isDialog(object)) return console.warn("This is not a dialog element");
        if (this.target.parentElement.nodeName === "TEMPLATE") return;
        this.target = object;
    } else {
        /** @type {Application} */
        this.application = object;
        // this.closeable = true;
        this.target = createDialog();
        if (typeof object.classes === 'object'){
            object.classes.forEach(function (someclass) { this.target.classList.add(someclass); }, dialog); // We can't use class since it's a keyword!!
        }
        this.frame = object.src;
        this.title = object.title;
        this.id = object.id || this.title|| this.id;
        this.fixed = object.fixed;
        this.scroll = object.scroll;
        if (object.microphone || object.camera) this.frame.setAttribute("allow", "camera; microphone");

        this.frame.setAttribute("allow", "fullscreen");

        this.moveEvents = object.moveEvents || false;
    }

    
    this._title = object.title || this.getTitleElement().innerText;
    this.id = object.id || this.id || this.title;
    this.minWidth = 100;
    this.minHeight = 200;
    
    this.buttons = [];
    this.originalBody = this.body;
    this.clickOffset = {
        x: 0, y: 0, height: 0, width: 0, start: {x: 0, y: 0}, stats: {
            start: 0, last: 0, positions: [new Vector()], position: new Vector(), lastPosition: new Vector(), difference: new Vector(),
            reset: function () { return this.start = Date.now(), this.last = this.start, this.position = new Vector(), this; }, // De nieuwe manier reset(){} zou moeten toegepast worden, maar I am doing it the inappropriate way for compatibility with Internet Explorer 11.
            update: function(x, y){
                this.last = Date.now();
                this.position.x = x, this.position.y = y;
                this.positions.push(this.position.clone());
                this.difference = (this.lastPosition = this.positions.shift()).clone().sub(this.position);
                this;return this; }
        },
        clear: function () { this.x = 0, this.y = 0; } // Modern way: clear(){}. I am doing it the old way for compatibility. Not all browsers understand the new notation yet.
    };

    if(!this.scroll) this.body.style.overflow = "hidden";

    // This adds application shortcuts to the app drawer, which currently rests on the desktop. I will make another drawer for mobile and make a pop-up drawer from the dock with the option to pin apps to it. I probably won't have enough time to implement an in-browser file manager, the localStorage API is limited to 5-10MB and using persistent storage requires browser specific APIs that don't work consistently yet.
    document.getElementById("applist").appendChild(this.createOpenButton());
    document.getElementById("metroapplist").appendChild(this.createOpenButton());

    this.toggleCloseButton(true);
    this.toggleFullButton(true);
    if (this.verifyEjectCapability()) this.toggleEjectButton(true);

    this.synchronise = synchroniseDialogState.bind(this);

    this.exchangeDialogMouseUpEvent = this.messageFrame.bind(this, "mouseUp", { difference: new Vector });

    this.exchangeDialogMoveEvent = function (difference) { // Async is not supported in IE11?!? I chose some async since we don't need the return value and I need the window move to be as fast as possible. The next best option is a service worker!!
        if (difference) this.messageFrame("windowMove", dialog.clickOffset.stats.update(difference.x, difference.y));
    };

    if (object.body) this.body.appendChild(object.body);

    /*const*/var target = this.target, body = getDialogBody(target), borderSection = target.getElementsByTagName("section")[0];

    if(borderSection && !this.fixed) {
        for (/*let*/var index = 0; index < 8; index++) {
            /*const*/var div = document.createElement("div");
            div.draggable = false, div.id = index + 1;
            /*const*/var pointerDown = function (ev) {
                dragAction.set(ev.target.id);
            }; // You can also put index + 1 in here instead for optimal efficiency and minimalism, but Internet Explorer is a very stubborn browser and does not instantiate the index variable but keeps one in memory resulting in resize direction being 9. Despite this it uses very little memory compared to Firefox and Chrome?
            if (supportsPointer) div.onpointerdown = pointerDown;
            else div.onmousedown = pointerDown;
            target.appendChild(div);
        }
    }

    body.addEventListener("load", function (event) { try { verifyEjectCapability(getEventDialog(event)); } catch (exception) { target.getElementsByTagName("button")[0].style.display = "none"; }});
    
    if (supportsPointer) this.target.addEventListener("pointerdown", function (ev) { windowActivationEvent(ev, this) });
    else this.target.addEventListener("mousedown", function (ev) { windowActivationEvent(ev, this) });
    this.target.getElementsByTagName("button")[windowButtons.eject].addEventListener("click", function(event){
        /*const*/var rect = target.getClientRects()[0];
        /*const*/var viewboxPosition = getViewboxPosition();
        /*const*/var propeties = {
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

        window.open(dialog.href, dialog.title, stringifyDialogProperties(propeties));
        dialog.quit();
    });

    /*const*/var buttons = target.getElementsByTagName("button");
    buttons[windowButtons.close].addEventListener("click", function () {
        dialog.close();
    }.bind(dialog));
    buttons[windowButtons.full].addEventListener("click", function(){dialog.toggleFullScreen()});
    this.close();

    this.synchronise();

    windows[this.id] = this;
}

function max(a, b) {
    if (typeof a == "number" && typeof b == "number") {
        if (a > b) return a;
        else return b;
    }
}

function min(a, b) {
    if (typeof a == "number" && typeof b == "number") {
        if (a < b) return a;
        else return b;
    }
}

// Dialog.prototype. = {
Object.defineProperty(Dialog.prototype, "isOpen", {
    get: function() { return this.target.hasAttribute("open"); },
    set: function(force) { this.target.toggleAttribute("open", force), this.activate(); }
});
Object.defineProperty(Dialog.prototype, "frame", {
    get: function() { return this.target && this.target.getElementsByTagName("iframe")[0] || document.createElement("iframe"); },
    set: function(url) { this.body.appendChild(document.createElement("iframe")), this.frame.src = url; }
});
Object.defineProperty(Dialog.prototype, "body", {
    get: function() { return  this.content ? this.content.children[1] : null; },
});
Object.defineProperty(Dialog.prototype, "head", {
    get: function() { return  this.target ?this.target.getElementsByTagName("header")[0] : null; },
});

Object.defineProperty(Dialog.prototype, "x", {
    get: function() { return this._x; },
    set: function(x) { if (typeof x == "number") {
        this._x = max(x, 0)
        if (useTransform) {
            this.move(this._x, this._y);
            this.target.style.left = "0px";
        } else {
            this.target.style.left = toPixels(this._x);
            this.target.style.transform = "none";
        }
     } }
});

Object.defineProperty(Dialog.prototype, "y", {
    get: function() { return this._y; },
    set: function(y) {
        if (typeof y !== "number") return;
        this._y = max(y, 0)
        if (useTransform) {
            this.move(this._x, this._y);
            this.target.style.top = "0px";
        } else {
            this.target.style.top = toPixels(this._y);
            this.target.style.transform = "none";
        }
    }
});
    
Object.defineProperty(Dialog.prototype, "width", {
    get: function() { return this._width; },
    set: function(width) {
        if (typeof width !== "number") return;
            this.target.style.width = toPixels(this._width = max(width, this.minWidth));
        
        this._isMinWidth = this._width === this.minWidth;
    }
});

Object.defineProperty(Dialog.prototype, "height", {
    get: function() { return this._height; },
    set: function(height) { if (typeof height == "number") this.target.style.height = toPixels(this._height = max(height, this.minHeight)); this._isMinHeight = this._height === this.minHeight }
});

Object.defineProperty(Dialog.prototype, "top", {
    get: function() { return this.y; },
    set: function(top) {
        /*const*/var difference  = this.top - top;
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
        /*const*/var difference  = this.left - left;
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
    set: function(title) { this.getTitleElement().innerText = this._title = title; }
});

Object.defineProperty(Dialog.prototype, "id", {
    get: function() { return this._id || (this.target && this.target.getAttribute("id")); },
    set: function(id) {
        this._id = id;
        windows[id] = this;
        this.target.setAttribute("id", id);
    }
});

Object.defineProperty(Dialog.prototype, "content", {
    get: function() {
        if (!this.target) return null;
        /** @type {HTMLElement} */
        /*const*/var content = this.target.getElementsByTagName("content")[0];
        return content;
    }
});

Object.defineProperty(Dialog.prototype, "closeable", {
    get: function() { return this.application != null; }
});

Object.defineProperty(Dialog.prototype, "borderSize", {
    set: function (value) {
        this.content.style.padding = toPixels(value);
        this.content.style.border = toPixels(value);
        this.content.style.borderRadius = toPixels(value);
    },
    get: function () { return fromPixels(this.content.style.padding); },
});

/** @type {Dialog} */
/*let*/var focusedDialog = null;
Dialog.prototype.focus = function() {
    if (focusedDialog !== null)
        focusedDialog.target.removeAttribute("focus");
    if (this.target) this.target.setAttribute("focus", true);
    focusedDialog = this;
}
Dialog.prototype.activate = function () {
    this.focus();
    return this.target.style.zIndex = this.z = topZ++, this.messageFrame(Messenger.types.open), activeDialog = this.id, swapMetroBody(this);

}
Dialog.prototype.getTitleElement = function () { return this.head.querySelector("h1"); }
Dialog.prototype.toggleTitlebar = function (force) { return !this.head.classList.toggle("hidden", typeof force !== 'undefined' ? !force : undefined); }
Dialog.prototype.open = function () { return this.isOpen = true, saveDialogState(), this.isOpen; }, // Open, save, return if it's opened or not
Dialog.prototype.close = function () { return this.isOpen = false, saveDialogState(), this.isOpen/* this.target.removeAttribute("open")*/; }
Dialog.prototype.getInnerRect = function () { return { top: this.target.offsetTop, left: this.target.offsetLeft, right: this.target.offsetRight, bottom: this.target.offsetBottom, width: this.target.offsetWidth, height: this.target.offsetHeight }; }, // This builds a rect without extra function calls and includes the dimension offsets caused by css transformations. This allows us to actually move the windows correctly WHILE the animation is playing. Try it out if you think you're fast enough (or change the animation speed)
Dialog.prototype.getRect = function (index) { return index == null ? this.target.getBoundingClientRect() : this.target.getClientRects()[index]; }
Dialog.prototype.getButton = function (index) { return this.head && this.head.getElementsByTagName("button")[index]; }
Dialog.prototype.createOpenButton = function () { return this.buttons.unshift(document.createElement("button")), this.buttons[0].innerText = this.title, this.buttons[0].onclick = this.launch.bind(this), this.buttons[0] }
Dialog.prototype.setClickOffset = function (x, y) {
    /*const*/var rect = this.getRect();
    return this.clickOffset.x = x, this.clickOffset.y = y, this.clickOffset.height = window.height || rect.height, this.clickOffset.width = window.width || rect.width, this.clickOffset.top = rect.top, this.clickOffset.left = rect.left, this.clickOffset.stats.reset();
}
Dialog.prototype.verifyEjectCapability = function () {return !!(this.href); };
Object.defineProperty(Dialog.prototype, "href", { get: function () {
    if (!this.application) return false;
    return this.application.src;
}});
Dialog.prototype.togglePointerEvents = function (enable) {
    if (enable == null) enable = this.target.style.pointerEvents == "none";
    /*const*/var events = enable ? "auto" : "none";
    if (this.target) this.target.style.pointerEvents = events;
    if (this.originalBody) this.originalBody.style.pointerEvents = events;
    if (this.frame || this.getFrame()) (this.frame || this.getFrame()).style.pointerEvents = events;
    return events;
    // return (this.frame || this.getFrame()).style.pointerEvents = enable ? "auto" : "none";
}
Dialog.prototype.toggleButton = function (buttonId, enable) { return this.getButton(buttonId).toggleAttribute("disabled", !enable); };
Dialog.prototype.clearClickOffset = function () { this.clickOffset.clear(); };
Dialog.prototype.toggleFullScreen = function (enable) { this.target.toggleAttribute("full", enable); };
Dialog.prototype.toggleCloseButton = function (enable) { this.toggleButton(windowButtons.close, enable); };
Dialog.prototype.toggleEjectButton = function (enable) { this.toggleButton(windowButtons.eject, enable); };
Dialog.prototype.toggleFullButton = function (enable) { this.toggleButton(windowButtons.full, enable); };
Dialog.prototype.messageFrame = function (type, message) { Messenger.broadcastToChild(type, message, this.frame); };
Dialog.prototype.move = function (x, y) {
    if (useTransform) {
        this._x = x, this._y = y;
        this.target.style.transform = "translate(" + toPixels(x) + "," + toPixels(y) + ")";
        this.target.style.webkitTransform = "translate(" + toPixels(x) + "," + toPixels(y) + ")";
    } else this.x = x, this.y = y;
}
Dialog.prototype.resize = function (width, height) { this.width = width, this.height = height, this.target.style.boxSizing = "border-box"; }
Dialog.prototype.resizeBody = function (width, height) { if (this.body) this.body.style.width = (this.width = width) + "px", this.body.style.height = (this.height = height) + "px", this.target.style.width = null, this.target.style.height = null, this.body.style.boxSizing = "content-box"; }
Dialog.prototype.openUrl = function (url) {
    /*const*/var frameUrl = new URL(this.frame.src);
    frameUrl.searchParams.set("url", url);
    this.frame.src = frameUrl.href;
    this.launch();
};

Dialog.prototype.quit = function () {
    if (this.closeable) {
        this.target.parentElement.removeChild(this.target);
        this.target = null;
    }
    else this.close();
 };
Dialog.prototype.launch = function () {
    if (!this.target) this.initWithObject(this.application);

    this.open();
}

Dialog.prototype.relaunch = function () {
    this.quit();
    this.launch();
};

/**
 * @typedef {{x: number, y: number}} Vector
 */
/**
 * @typedef {(dialog: Dialog, offset: DOMRect, difference)=>void} DragFunction
 */

// This was another test to check performance. It's basically an older version of the drag calculator which updates the positions at average 0.1-0.5ms in Chrome on my laptop. This method turns out to be faster for IE11 than it is for Chrome on the same computer. I left it in for performance reasons because it works so well, this lets us boost window dragging for older browsers.
function DragAction(){ // This looks less elegant than checking on mouse move but if we simply define the function in advance we save quite a lot of performance by doing the resize method calculations in advance instead on every mouse move tick. I also intentionally split the code up again so we do have duplicate code but in this case it's far more efficient to do 1 function call with 0 if statements than doing 16 function calls with 3 * 6 + 2 if statements for each direction on every mousemove event! Even the visually pleasing but technically sluggish method works relatively smoothly on modern browsers, it gets quite horrible once reflections and blur are enabled, these effects are done by native code in the browser and we can't optimise that so I did my best to make this as efficient as I could come up with. Performance is absolutely necessary because we want the window dragging to feel instantaneous, lag is absolutely not tolerated even on slow hardware and deprecated browsers!
    /** @type {DragFunction} */
    this.execute = function(){};
    /** @type {DragFunction[]} */
    this.resizeFunctions = [
        function(dialog, offset, difference){ dialog.move(offset.left + difference.x, offset.top + difference.y) }, // Move
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

DragAction.prototype = {
    set: function(direction) { this.execute = this.resizeFunctions[direction || 0] || new Function }
}

function DocumentCrawler(document){
    this.document = document;
}

DocumentCrawler.prototype = {
    getMetro: function(){ return this.document.getElementById("metrobody") },
    getDesktop: function(){ return this.document.getElementById("desktop") },
    getMetroBody: function(){ return this.getMetro().firstChild },
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
/** @type {{[id:string]: Dialog}} */
/*const*/var windows = {};
/*const*/var windowButtons = {
    eject: 0,
    full: 1,
    close: 2
};
/*let*/var activeDialog = null;
/*let*/var resizeDirection = 0;
/*let*/var topZ = 100;
/*let*/var bodyCrawler = new DocumentCrawler(document);
/*let*/var metroBodyOrigin;
/*let*/var timeout;
/*let*/var loaded = false;
/*const*/var dragAction = new DragAction();
// /*let*/var flipped = false;

function messageReceived(type, data, source){ // I have yet to make a wrapper function that takes care of the types and data parsing for ease of use by another user who doesn't understand what I'm doing here, it needs to be done manually by me for now!
    //console.log(data, type, source)    
    /*const*/var types = Messenger.types;
    if (source) {
        if (type === types.windowSize) windows[source].resizeBody(data.width, data.height); // If our dialog gives us a specific size, we act accordingly and give it what it wants! We swith the window size from being based on the non-client area size, and we make the non-client area wrap around the client area, fully giving sizing control to the client. This way our system can suffice the client's demands.
        switch (type) {
            case types.launchOverlay:
                bodyCrawler.overlay.ontransitionend = function () {
                    windows[source].messageFrame(Messenger.types.prepareToLaunchOverlay);
                    /*const*/var oriurl = new URL(windows[source].frame.src);
                    oriurl.searchParams.set("fullscreen", true);
                    windows[source].frame.src = oriurl.href;
                    bodyCrawler.overlay.ontransitionend = null;
                    bodyCrawler.overlay.requestFullscreen();
                    bodyCrawler.overlay.appendChild(windows[source].body);
                    window.setTimeout(bodyCrawler.overlay.classList.add.bind(bodyCrawler.overlay.classList, "shown"), 500);
                };
                bodyCrawler.overlay.classList.toggle("open");
                break;
            case types.readyToLaunchOverlay:
                    bodyCrawler.overlay.appendChild(windows[source].body);
                    window.setTimeout(bodyCrawler.overlay.classList.add.bind(bodyCrawler.overlay.classList, "shown"), 500);
                break;
        }
        console.log("Received message " + type);
    }
}

function swapMetroBody(){
    if (!flipped) return;
    restoreMetroBody();
    activeDialogToMetro();
}

function restoreMetroBody(){
    retrieveDialogBodyFromMetro(windows[metroBodyOrigin]);
}

function activeDialogToMetro(){
    exportDialogBodyToMetro(windows[activeDialog]);
}

function flip(enable){
    bodyCrawler.getDesktop().toggleAttribute("flipped", enable); // Deprecated, I am switching transferring this attribute to a class.
    flipHandler(bodyCrawler.getDesktop().classList.toggle("flipped", enable));
}

function flipHandler(enabled){
    toggleCharms(false);
    swapMetroBody();
    return flipped = enabled;
}

Messenger.receive(messageReceived);

/*const*/var toggleOverlay = bodyCrawler.overlay.classList.toggle.bind(bodyCrawler.overlay.classList, "open"); // The force attribute gets automatically forwarded!

toggleOverlay(loadingOverlay);

if (loadingOverlay) document.getElementById("desktop").ontransitionend = checkForFlip;
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

window.onresize = checkForFlip();
//felse loaded = true;

function initializeDialogs() {
    if (typeof onpointerup !== "undefined") document.onpointerup = disableDialogDrag;
    else document.onmouseup = disableDialogDrag;
    // if (document.ontouchend) document.ontouchend = disableDialogDrag;
    
    dragAction.set(0);
    /*const*/var dialogs = bodyCrawler.getAllDialogs();
    dialogs.forEach(function (dialog) {
        windows[dialog.id] = new Dialog(dialog); 
    });
    //flip();
    checkForFlip();
    loadDialogState();
}

// Normally we use /*const*/var in for in loops!
// I am using /*let*/var for Internet Explorer 11 and other old browsers that create one instance of the looping variable and assign a new value to the same variable instead of creating a new one every time. This can cause problems if we use /*const*/var because you can't assign to a const! It also limits us from using that variable in the loop for "higher order" functions, also known as delegates or callbacks, since the same variable gets modified on these browsers.

/**
 * Activates the window on which the provided event was fired.
 * @param {MouseEvent | PointerEvent} event 
 * @param {Dialog} dialog 
 * @returns 
 */
function windowActivationEvent(event, dialog){
    console.log("Activating window", dialog);
    if (!dialog) dialog = getEventDialog(event);
    // if (!isDialog(dialog)) return console.warn("This is not a dialog");
    activeDialog = dialog.id;
    resizeDirection = 0;
    enableDialogDrag();
    windows[activeDialog].setClickOffset(event.clientX || 0, event.clientY || 0);
    windows[activeDialog].activate();
    return dialog;
}

/**
 * @param {PointerEvent | MouseEvent} event 
 */
function windowDragEvent(event){
    try {
        /*const*/var dialog = windows[activeDialog];
        /*const*/var difference = { x: event.clientX - dialog.clickOffset.x, y: event.clientY - dialog.clickOffset.y };

        dragAction.execute(dialog, dialog.clickOffset, difference);

        // console.log("moving")
        
        if(dialog.moveEvents) dialog.exchangeDialogMoveEvent(difference);
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
    dragAction.set(0);
    for (/*let*/var index in windows) windows[index].togglePointerEvents(true);
    if (canSave) saveDialogState();
    if (windows[activeDialog])
        if (windows[activeDialog].moveEvents) windows[activeDialog].exchangeDialogMouseUpEvent();
}

function enableDialogDrag(){
    toggleDialogDragEventHandler(true);
    for (/*let*/var index in windows) windows[index].togglePointerEvents(false);
}

function updateTopZ() {
    for (/*let*/var window in windows) if (windows[window].z > topZ) topZ = windows[window].z;
}

function stringifyDialogProperties(properties){
    return JSON.stringify(properties).replace(/true/g, "yes").replace(/false/g, "no").replace(/:/g, '=').replace(/}|{|"/g, '');
}

/**
 * @param {HTMLElement} target 
 * @returns HTMLElement
 */
function getDialogBody(target) { // I am specifically not using querySelector in case we want an actual HTMLElement reference instead of a node! QuerySelector may be faster but I'm not using this function in time sensitive operations like the window drag, so I prefer functionality instead. The most left is the most recent revision. I removed the deprecated ones but if I make even more changes to the design of the dialogs I'll have to clean it up again or it'll get too long. We theoretically only need one, so as soon as I rebuilt all dialogs it can be simplified to one.
    return target.getElementsByTagName("content")[1] || target.getElementsByTagName("section")[1] || target.querySelector("article") || target.getElementsByClassName("client")[0] || target.getElementsByTagName("iframe")[0] || target.getElementsByTagName("section")[1] || target.getElementsByClassName("body")[0] || target.children[2];//&&&&&&&&&&&&&;
}

function getViewboxPosition(){
    return { left: window.screenLeft, top: window.screenTop }
}

/**
 * @param {HTMLElement} object 
 * @returns HTMLElement
 */
function getObjectDialog(object){ // Alternatieve methode aan recursief het evenement af te gaan zou zijn door over de elementsFromPoint stack te lopen.
    if (!object.classList) return console.log(object);
    if (["DIALOG", "BODY", "HTML", "HEAD"].indexOf(object.tagName)!=-1 || (object.classList && object.classList.contains("window"))) return object;
    else if (object.target) return getObjectDialog(object.target);
    else return getObjectDialog(object.parentElement);
}

/**
 * @param {Event} event 
 * @returns HTMLElement
 */
function getEventDialog(event) { // Hier is dus die alternatieve modus, maar hij lijkt soms last te hebben op IE11.
    if (fasterDialogTracking && event.clientX && event.clientY) try {
        /*const*/var window = document.elementsFromPoint(event.clientX, event.clientY).find(function (element) { return isDialog(element); });
        return window;
    } catch (ex) { console.error(ex) }
    return getObjectDialog(event);
}

/**
 * @param {number} value 
 * @returns string
 */
function toPixels(value) {
    return Math.round(value) + "px"; // This is why Chrome was jiggling around! I noticed it was rounding off the positions of the contained elements separately but if we round the total prosition it aligns properly to the pixel grid! Nevermind it's sitll broken... Come on chrome! It's working a lot better and you can only notice the 1px offsets if you look closely. Firefox, Internet Explorer and Edge do not have this issue at all! Actually now this issue is completely gone, even on Chrome I see absolutely no sign of the body shifting around. Might be thanks to the 5th restructuring of the dialog body.
}

/**
 * @param {number} pixels 
 * @returns number
 */
function pixelsToCentimeters(pixels){
    return (pixels * 2.54 / 96) * (window.devicePixelRatio || 1);
}

/**
 * @param {string} text 
 * @returns number
 */
function fromPixels(text){
    if (text != null) try { return typeof text === 'number' ? text : parseInt(text.replace("px", '')) }
    catch (ex) { return text }
    else return 0;
}

function synchroniseDialogState(window){
    window = this || window;
    if (window.x) window.x = window.x;
    if (window.y) window.y = window.y;
    if (window.z) window.target.style.zIndex = window.z;
    if (window.width) window.width = window.width;
    if (window.height) window.height = window.height;
}

// Onderdeel van de aller eerste window move event handler.
function contains(array, number){
    return Boolean(array.indexOf(number) + 1);
}

/**
 * @param {Dialog} dialog 
 * @deprecated
 */
function verifyEjectCapability(dialog){
    if (!dialog) return false;
    dialog.verifyEjectCapability();
}

function toggleBlur(enabled){ // Does not work on Chrome!
    if (enabled == null) document.body.toggleAttribute("blur");
    else document.body.toggleAttribute("blur", enabled);
    settings.set("blur", enabled);
}

function collectEssentialDialogData(target, source){ // By using the same function to exchange data in and out of the local storage we can modify what parameters we want to save on the fly.
    return target.isOpen = source.isOpen, target.z = source.z, target.x = fromPixels(source.x), target.y = fromPixels(source.y), target.width = fromPixels(source.width), target.height = fromPixels(source.height), target;
}

function handleStorageException(exception){
    console.error(exception);
    console.warn("A problem occurred, window state saving has been disabled for this session! The stored window state will be reset in an attempt to recover from this issue.");
    console.log("If you wish to save the window state before reset, copy this and put it somewhere else:", localStorage.windowState);
    localStorage.windowState = null; 
    canSave = false;
}

function saveDialogState(){
    if (!loaded) return;
    console.log("Saving window state.");
    if (canSave && localStorage) try {
        /*const*/var windowState = {};
        for (/*let*/var id in windows) {
            if (windows[id]){
                // windows[id].width = windows[id].target.clientWidth;
                // windows[id].height = windows[id].target.clientHeight;
                windowState[id] = collectEssentialDialogData({}, windows[id]);
            }
        }
        localStorage.setItem("windowState", JSON.stringify(windowState));
        // localStorage.windowState = JSON.stringify(windowState); // I had apparently used the wrong syntax by accident but this way of getting and setting works too for some reason. It's probably supposed to work this way too but I don't know what the correct way is.
    } catch (exception) {
        handleStorageException(exception);
    }
}

function loadDialogState(){
    console.log("Loading window state.")
    if (canSave) try {
        if (localStorage && localStorage.windowState){
            /*const*/var parsedDialogs = JSON.parse(localStorage.windowState), fails = [];
            for (/*let*/var window in parsedDialogs) try {
                if (windows[window] && parsedDialogs[window]) collectEssentialDialogData(windows[window], parsedDialogs[window]).synchronise(); // I made the collect function return the target so we can write this in one line.
            } catch (ex) { fails.push(ex); }
            fails.forEach(console.error.bind(this, "Tailed to load a window!"));
            updateTopZ();
        }
    } catch (exception) {
        handleStorageException(exception);
    } else console.error("Storage access is disabled for this session!");
}

function exportDialogBodyToMetro(dialog){
    if (bodyCrawler.getMetroBody()) restoreMetroBody();//return;//retrieveDialogBodyFromMetro();
    if (dialog){ // On modern browsers we can use the new shadow DOM in combination with slots to prevent iframes from firing a load event causing it to lose its state after being moved. On IE 9 and below it does not fire a reload for iframes, this functionality is inconsistent. Other option is css.
        /*const*/var metro = bodyCrawler.getMetro();
        if (metro && dialog.body) metroBodyOrigin = dialog.id, metro.appendChild(dialog.body);
    }
}

function retrieveDialogBodyFromMetro(dialog){
    /*const*/var metroBody = bodyCrawler.getMetroBody();
    if (!metroBody) return;
    if (dialog) dialog.content.appendChild(metroBody);
}

function getDialogTemplate(){
    return (document.querySelector("template").content || document.getElementsByTagName("template")[0]).children[0];//document.querySelector("template");
}

// Class to build dialogs that can be passed to the Dialog insertion API. Not finished, window construction objects have to be designed and built by hand for now!
function DialogBuilder(title, id){
    this.title = title;
    this.id = id;
    this.target;
    this.createDialog = function () { return this.target = bodyCrawler.getDialogsContainer().appendChild(removeComments(getDialogTemplate().cloneNode(true))); };
}

function createDialog(){
    return bodyCrawler.getDialogsContainer().appendChild(removeComments(getDialogTemplate().cloneNode(true)));
}

function removeComments(element){ // Removes the comments of an HTMLElement based object.
    element.childNodes.forEach(function (child) {
        if (child.nodeName=="#comment") element.removeChild(child);
        else removeComments(child);
    });
    return element;
}

function toggleCharms(force){
    return document.getElementById("charms").classList.toggle("open", force);
}

function isCharmsOpen() {
    return document.getElementById("charms").classList.contains("open");
}

function injectApplication(application){
    loadApp(application); // The Dialog class takes care of anything passed to it and tries to compile a dialog from the given data. This can be an HTMLElement or an object with each the correct structure.
    loadDialogState();
}

function loadApp(app) {
    windows[demo.id] = new Dialog(app);
}

function injectApplications(applications){
    applications.forEach(loadApp); // Awwor notation: applications.forEach(application => windows[demo.id] = new Dialog(application));
    loadDialogState();
}

function closeApp(appId) {
    /*const*/var element = windows[appId].target;
    element.parentElement.removeChild(element);
}

initializeDialogs();
toggleReflections(reflections);

/*\  The purpose is for this website to be functional on every browser that's less than or a decade old. I created my own polyfills for some functions that don't exist in ES5, so performance on ES6 browsers is expected to be better. Meow.
 * \  Tested and confirmed functional (can work on stuff I haven't tested too.):
 *  \  Chrome for Android Chrome targetting 36 and up.
 *   \  FireFox 115 ESR and up (should work on any version that's less than 10 years old, or at least has ES5 support (2009))
 *    \  Chromium 118 (That means Chrome, Edge Chromium, Brave, Opera, ...)
 *    /  ToDo: Test on Safari on Mac OS 10.7 Lion and 10.15 Catalina when I have time to do so. Same goes for Firefox and Chrome versions that I have installed on these systems. From the tests in Dialogs 8.1 I expect this to work fine!
 *   /  Internet Explorer 11
 *  /  Chrome 48
 * /  EdgeHTML 18 (Edge Legacy)
\*/
