
/*\
   \________
   / ______/\                                                 \\
  / /     /\ \    LWM (Lasse's Window Manager)                 \\
 /_/_____/  \ \   Targetting: ES5 (with custom ES6 extensions)  \\
 \ \     \  / /   Copyright: Lasse Lauwerys © 2023 - 2024       //
  \ \_____\/ /    Created: 17/12/2023                          //
   \_______\/                                                 //
   /
\*/

'use strict'; // Strict mode is required for older versions of Chrome (tested on 48, Windows 8.1 both destkop and Metro mode).

// Settings
let blur = false;
let reflections = true;
let fasterWindowTracking = false;
let canSave = true;
let IE11Booster = true;
let flipped = false;

function Dialog(object){ // Verouderde manier om een object constructor te maken. Tegenwoordig gebruiken we klassen, maar ik doe het hier nog zo voor compatibiliteit met ES5.
    /**
     * Creates an instance of a Dialog that allows the Dialog be resized and moved around.
     * @author Lasse Lauwerys
     * @param {Element} dialog This is a dialog element from the HTML structure.
     */

    if(!object) return;
    let dialog = this;

    this.messenger = new Messenger();
    const types = this.messenger.types;

    if(object.nodeName == "DIALOG"){
        this.target = object
    }
    else{
        this.target = createDialog();
        this.content = this.getContent();
        this.frame = this.getBody().appendChild(document.createElement("iframe"));
        this.src = this.frame.src = object.src;
        this.title = this.setTitle(object.title);
        this.id = this.setId(object.id || this.title);
        this.fixed = object.fixed;
        this.scroll = object.scroll;
        if(typeof object.classes === 'object'){
            object.classes.forEach(function(someclass){ this.target.classList.add(someclass) }, dialog); // We can't use class since it's a keyword!!
            // Arrow nonation: object.classes.forEach(someclass => this.object.target.classList.add(someclass)); Not used in this file for IE11 and other ES5 browsers.
        }
    }

    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.width = 0;
    this.height = 0;
    this.minWidth = 100;
    this.minHeight = 100;
    //this.isOpen = false;
    this.title = object.title || this.getTitle();
    this.id = object.id || this.getId() || this.title;
    this.moveEvents = object.moveEvents || false;
    this.content = this.getContent();
    this.body = this.getBody(); // An effort to trade memory for performance by caching everything.
    this.head = this.getHead();
    this.buttons = [];
    this.clickOffset = {
        x: 0, y: 0, height: 0, width: 0, start: {x: 0, y: 0}, stats: {
            start: 0, last: 0, positions: [new Vector], position: new Vector, lastPosition: new Vector, difference: new Vector,
            reset: function(){ return this.start = Date.now(), this.last = this.start, this.position = new Vector, this }, // De nieuwe manier reset(){} zou moeten toegepast worden, maar I am doing it the inappropriate way for compatibility with Internet Explorer 11.
            update: function(x, y){
                this.last = Date.now();
                this.position.x = x;
                this.position.y = y;
                this.positions.push(this.position.clone());
                this.difference = (this.lastPosition = this.positions.shift()).clone().sub(this.position);
                this;return this; } //
        },
        clear: function(){ this.x = 0, this.y = 0 } // Modern way: clear(){}. I am doing it the old way for compatibility. Not all browsers understand the new notation yet.
    },
    this.dragCalculator = new DragCalculator(this); // Watch out because this makes it circular! It also has to be defined after the properties the obect ,eeeeeeeeeeeeeee constructor needs.

    if(!this.scroll) this.body.style.overflow = "hidden";

    // This adds application shortcuts to the app drawer, which currently rests on the desktop. I will make another drawer for mobile and make a pop-up drawer from the dock with the option to pin apps to it. I probably won't have enough time to implement an in-browser file manager, the localStorage API is limited to 5-10MB and using persistent storage requires browser specific APIs that don't work consistently yet.
    document.getElementById("applist").appendChild(this.createOpenButton());

    this.verifyEjectCapability = function(){
        const style = this.getButton(windowButtons.eject).style;
        try { if(this.getFrame().contentWindow.location.href == null) style.display = "none" }
        catch (e){ style.display = "none" }
    }

    this.toggleCloseButton(true);
    this.toggleFullButton(true);
    if(this.verifyEjectCapability()) this.toggleEjectButton(true);

    this.synchronise = synchroniseWindowState.bind(this);

    this.exchangeWindowMouseUpEvent = function(){
        this.messageFrame("mouseUp", {difference:new Vector});
    }

    this.exchangeWindowMoveEvent = function (difference){ // Async is not supported in IE11?!? I chose some async since we don't need the return value and I need the window move to be as fast as possible. The next best option is a service worker!!
        if(difference)this.messageFrame("windowMove", dialog.clickOffset.stats.update(difference.x, difference.y));
    };

    // this.messageFrame = function(object, literal){
    //     if(this.frame) this.frame.contentWindow.postMessage(literal?object:JSON.stringify(object), '*');
    // }

    if(object.body) this.body.appendChild(object.body);
    this.setTitle(this.title);

    const target = this.target, body = getDialogBody(target), borderSection = target.getElementsByTagName("section")[0];

    if(borderSection && !this.fixed) for (let index = 0; index < 8; index++) {
        const div = target.appendChild(document.createElement("div"));
        div.draggable = false, div.id = index + 1,
        div.onmousedown = function(ev){
            if(IE11Booster) dragAction.set(ev.target.id);
            else dialog.dragCalculator.set(ev.target.id);
            //console.log(dialog, dialog.dragCalculator.set);
        } // You can also put index + 1 in here instead for optimal efficiency and minimalism, but Internet Explorer is a very stubborn browser and does not instantiate the index variable but keeps one in memory resulting in resize direction being 9. Despite this it uses very little memory compared to Firefox and Chrome?
    }

    body.addEventListener("load", function(event){ try { verifyEjectCapability(getEventDialog(event)) } catch (exception){ target.getElementsByTagName("button")[0].style.display = "none" }});
    this.target.addEventListener("mousedown", function(event){ if(getEventDialog(event).tagName == "DIALOG") windowActivationEvent(event) });
    this.target.getElementsByTagName("button")[windowButtons.eject].addEventListener("click", function(event){
        const dialog = getEventDialog(event)
        const rect = target.getClientRects()[0];
        const viewboxPosition = getViewboxPosition();
        const propeties = {
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

        window.open(dialog.getElementsByTagName("iframe")[0].contentWindow.location.href, windows[dialog.id].title, stringifyWindowProperties(propeties) /*"scrollbars=yes,resizable=yes,status=no,location=yes,toolbar=no,menubar=no,width=10,height=10,left=100,top=100"*/);
    });

    const buttons = target.getElementsByTagName("button");
    buttons[windowButtons.close].addEventListener("click", function(event){
        //const dialog = getEventDialog(event);
        dialog.close();
        //console.log("MER" + dialog.isOpen)
    });
    buttons[windowButtons.full].addEventListener("click", function(){dialog.toggleFullScreen()});
    this.close();

    this.synchronise();

    windows[this.id] = this;
}

Dialog.prototype = {
    get isOpen(){ return this.target.hasAttribute("open"); },
    set isOpen(force){ this.target.toggleAttribute("open", force), this.activate();/* , this.focus() */ },
    activate: function(){ this.target.style.zIndex = topZ++, this.messageFrame(Messenger.types.open)/* Messenger.m */; },
    setTitle: function(title){ return this.getTitleElement().innerText = title; },
    getTitleElement: function(){ return this.getHead().querySelector("h1"); },
    getContent: function(){ return this.target.getElementsByTagName("content")[0]; },
    getFrame: function(){ return this.frame = this.target.getElementsByTagName("iframe")[0] || document.createElement("iframe"); },
    getTitle: function(){ return this.getTitleElement().innerText; },
    getHead: function(){ return this.target.getElementsByTagName("header")[0]; },
    getBody: function(){ return this.content.children[1]; },
    setId: function(id){ return windows[id] = this, this.target.setAttribute("id", id); },
    getId: function(){ return this.target.getAttribute("id"); },
    toggleTitlebar: function(force){ return !this.head.classList.toggle("hidden", typeof force!=='undefined'?!force:undefined); },
    open: function(){ return this.isOpen = true, saveWindowState(), this.isOpen; }, // Open, save, return if it's opened or not.
    close: function(){ return this.isOpen = false, saveWindowState(), this.isOpen/* this.target.removeAttribute("open")*/; },
    getInnerRect: function(){ return {top: this.target.offsetTop, left: this.target.offsetLeft, right: this.target.offsetRight, bottom: this.target.offsetBottom, width: this.target.offsetWidth, height: this.target.offsetHeight}; }, // This builds a rect without extra function calls and includes the dimension offsets caused by css transformations. This allows us to actually move the windows correctly WHILE the animation is playing. Try it out if you think you're fast enough (or change the animation speed),
    getRect: function(index){ return index == null? this.target.getBoundingClientRect(): this.target.getClientRects()[index]; },
    getButton: function(index){ return this.head.getElementsByTagName("button")[index]; },
    createOpenButton: function(){ return this.buttons.unshift(document.createElement("button")), this.buttons[0].innerText = this.title, this.buttons[0].onclick = this.open.bind(this), this.buttons[0]},
    setClickOffset: function(x, y){ return this.clickOffset.x = x, this.clickOffset.y = y, this.clickOffset.height = window.height || this.target.offsetHeight, this.clickOffset.width = window.width || this.target.offsetWidth, this.clickOffset.top = this.target.offsetTop, this.clickOffset.left = this.target.offsetLeft, this.clickOffset.stats.reset(); },
    togglePointerEvents: function(enable){ return this.target.style.pointerEvents = this.body.style.pointerEvents = (this.frame || this.getFrame()).style.pointerEvents = enable == null? this.target.style.pointerEvents == "none" : enable ? "auto" : "none"; },
    toggleButton: function(buttonId, enable){ return this.getButton(buttonId).toggleAttribute("disabled", !enable); },
    clearClickOffset: function(){ this.clickOffset.clear(); },
    toggleFullScreen: function(enable){ this.target.toggleAttribute("full", enable); },
    toggleCloseButton: function(enable){ this.toggleButton(windowButtons.close, enable); },
    toggleEjectButton: function(enable){ this.toggleButton(windowButtons.eject, enable); },
    toggleFullButton: function(enable){ this.toggleButton(windowButtons.full, enable); },
    messageFrame: function(type, message){ Messenger.broadcastToChild(type, message, this.frame); },
    move: function(x, y){ this.target.style.left = (this.x = x) + "px", this.target.style.top = (this.y = y) + "px"; },
    resize: function(width, height){ this.target.style.width = (this.width = width) + "px", this.target.style.height = (this.height = height) + "px", this.target.style.boxSizing = "border-box"; },
    resizeBody: function(width, height){ this.body.style.width = (this.width = width) + "px", this.body.style.height = (this.height = height) + "px", this.target.style.width = null, this.target.style.height = null, this.body.style.boxSizing = "content-box"; },
    openUrl: function(url){
        const frameUrl = new URL(this.frame.src);
        frameUrl.searchParams.set("url", url);
        this.frame.src = frameUrl.href;
        this.launch();
    },
}

function DragCalculator(dialog){ // This is the 4th iteration of optimising the window drag calculations. This is a little bit slower than the previous version but it's far cleaner and more easy to modify so I can add constraints.
    this.dialog = dialog;
    this.offset = dialog.clickOffset;
    this.style = dialog.target.style;
}

DragCalculator.prototype = {
    set: function(direction){ this.update = this.operations[direction] },
    get top(){ return (this.dialog.y = this.offset.top + this.difference.y) + "px" },
    get left(){ return (this.dialog.x = this.offset.left + this.difference.x) + "px" },
    get width(){ return (this.dialog.width = this.offset.width + this.difference.x), console.log(this.dialog.width, this.dialog.minWidth), ((this.dialog.width < this.dialog.minWidth)? this.dialog.minWidth: this.dialog.width) + "px" },
    get height(){ return (this.dialog.height = this.offset.height + this.difference.y), console.log(this.dialog.width, this.dialog.minWidth), ((this.dialog.height < this.dialog.minHeight)? this.dialog.minHeight: this.dialog.height) + "px" },
    get widthrv(){ return (this.dialog.width = this.offset.width - this.difference.x), console.log(this.dialog.width, this.dialog.minWidth), ((this.dialog.width < this.dialog.minWidth)? this.dialog.minWidth: this.dialog.width) + "px" },
    get heightrv(){ return (this.dialog.height = this.offset.height - this.difference.y), console.log(this.dialog.width, this.dialog.minWidth), ((this.dialog.height < this.dialog.minHeight)? this.dialog.minHeight: this.dialog.height) + "px" },
    get difference() { return this._difference },
    set difference(pos) { this._difference.x = pos.x - this.offset.x, this._difference.y = pos.y - this.offset.y },
    dialog: null,
    offset: new Object,
    scroll: new Vector,
    update: new Function,
    _difference: new Vector,
    operations: [ // It doesn't look good but it's the absolute fastest I can make it. For this part I pick function over readability, the speed of the window movements is the most important thing.
        function(position){ return (this.difference = position, this.style.left = this.left, this.style.top = this.top, this._difference) },
        function(position){ return (this.difference = position, this.style.height = this.heightrv, this.style.top = this.top, this._difference) },
        function(position){ return (this.difference = position, this.style.width = this.width, this._difference) },
        function(position){ return (this.difference = position, this.style.height = this.height, this._difference) },
        function(position){ return (this.difference = position, this.style.left = this.left, this.style.width = this.widthrv, this._difference) },
        function(position){ return (this.difference = position, this.style.left = this.left, this.style.width = this.widthrv, this.style.height = this.heightrv, this.style.top = this.top, this._difference) },
        function(position){ return (this.difference = position, this.style.width = this.width, this.style.height = this.heightrv,style.top = this.top, this._difference) },
        function(position){ return (this.difference = position, this.style.height = this.height, this.style.width = this.width, this._difference) },
        function(position){ return (this.difference = position, this.style.left = this.left, this.style.width = this.widthrv, this.style.height = this.heigh, this._difference) },
        function(){}
    ]
}

// This was another test to check performance. It's basically an older version of the drag calculator which updates the positions at average 0.1-0.5ms in Chrome on my laptop. This method turns out to be faster for IE11 than it is for Chrome on the same computer. I left it in for performance reasons because it works so well, this lets us boost window dragging for older browsers.
function DragAction(){ // This looks less elegant than checking on mouse move but if we simply define the function in advance we save quite a lot of performance by doing the resize method calculations in advance instead on every mouse move tick. I also intentionally split the code up again so we do have duplicate code but in this case it's far more efficient to do 1 function call with 0 if statements than doing 16 function calls with 3 * 6 + 2 if statements for each direction on every mousemove event! Even the visually pleasing but technically sluggish method works relatively smoothly on modern browsers, it gets quite horrible once reflections and blur are enabled, these effects are done by native code in the browser and we can't optimise that so I did my best to make this as efficient as I could come up with. Performance is absolutely necessary because we want the window dragging to feel instantaneous, lag is absolutely not tolerated even on slow hardware and deprecated browsers!
    this.execute = function(){};
    this.resizeFunctions = [
        function(dialog, offset, difference, style){ return (style.left = (dialog.x = offset.left + difference.x) + "px", style.top = (dialog.y = offset.top + difference.y) + "px"), difference },
        function(dialog, offset, difference, style){ return (style.height = (dialog.height = offset.height - difference.y) + "px", style.top = (dialog.y = offset.top + difference.y) + "px"), difference },
        function(dialog, offset, difference, style){ return (style.width = (dialog.width = offset.width + difference.x) + "px"), difference },
        function(dialog, offset, difference, style){ return (style.height = (dialog.height = offset.height + difference.y) + "px"), difference },
        function(dialog, offset, difference, style){ return (style.left = (dialog.x = offset.left + difference.x) + "px", style.width = (dialog.width = offset.width - difference.x) + "px"), difference },
        function(dialog, offset, difference, style){ return (style.left = (dialog.x = offset.left + difference.x) + "px", style.width = (dialog.width = offset.width - difference.x) + "px", style.height = (dialog.height = offset.height - difference.y) + "px", style.top = (dialog.y = offset.top + difference.y) + "px"), difference },
        function(dialog, offset, difference, style){ return (style.width = (dialog.width = offset.width + difference.x) + "px", style.height = (dialog.height = offset.height - difference.y) + "px",style.top = (dialog.y = offset.top + difference.y) + "px"), difference },
        function(dialog, offset, difference, style){ return (style.height = (dialog.height = offset.height + difference.y) + "px", style.width = (dialog.width = offset.width + difference.x) + "px"), difference },
        function(dialog, offset, difference, style){ return (style.left = (dialog.x = offset.left + difference.x) + "px", style.width = (dialog.width = offset.width - difference.x) + "px", style.height = (dialog.height = offset.height + difference.y) + "px"), difference },
    ];
}

DragAction.prototype = {
    set: function(direction){ this.execute = this.resizeFunctions[direction] || new Function },
}

function DocumentCrawler(document){
    this.document = document;
}

DocumentCrawler.prototype = {
    getMetro: function(){ return this.document.getElementById("metro") },
    getDesktop: function(){ return this.document.getElementById("desktop") },
    getMetroBody: function(){ return this.getMetro().firstChild },
    getAllDialogs: function(){ return this.document.getElementsByTagName("dialog") },
    getWindowsContainer: function(){ return this.document.getElementById("windows") },
    get overlay(){ return document.getElementById("overlay"); },
    get charms(){ return document.getElementById("charms"); },
    get settings(){ return document.getElementById("settings"); },
    get theme(){ return document.getElementById("theme"); },
    get desktop(){ return document.getElementById("desktop"); },
    get applist(){ return document.getElementById("applist"); },
}

// Setting up the global variables after defining the classes to avoid undefined prototypes!
const windows = {}; // MDN says not to use "new Object();". W3Schools adds to it that {} is faster and more readable.
const windowButtons = {
    eject: 0,
    full: 1,
    close: 2
};
let activeWindow = null;
let activeDrag = false;
let dragAction = new DragAction();
let resizeDirection = 0;
let topZ = 100;
let bodyCrawler = new DocumentCrawler(document);

function messageReceived(type, data, source){ // I have yet to make a wrapper function that takes care of the types and data parsing for ease of use by another user who doesn't understand what I'm doing here, it needs to be done manually by me for now!
    //console.log(data, type, source)    
    const types = Messenger.types;
    if(source){
        if(type === types.windowSize) windows[source].resizeBody(data.width, data.height); // If our dialog gives us a specific size, we act accordingly and give it what it wants! We swith the window size from being based on the non-client area size, and we make the non-client area wrap around the client area, fully giving sizing control to the client. This way our system can suffice the client's demands.
        switch(type){
            case types.launchOverlay:
                bodyCrawler.overlay.ontransitionend = function(){
                    windows[source].messageFrame(Messenger.types.prepareToLaunchOverlay);
                    const oriurl = new URL(windows[source].frame.src);
                    oriurl.searchParams.set("fullscreen", true);
                    windows[source].frame.src = oriurl.href;
                    bodyCrawler.overlay.ontransitionend = null;
                    bodyCrawler.overlay.requestFullscreen();
                    bodyCrawler.overlay.appendChild(windows[source].body);
                    window.setTimeout(bodyCrawler.overlay.classList.add.bind(bodyCrawler.overlay.classList, "shown"), 500);
                }
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
Messenger.receive(messageReceived);

function flip(enable){
    flipHandler(bodyCrawler.getDesktop().toggleAttribute("flipped", enable));
}

function flipHandler(flipped){
    const window = windows[activeWindow] || windows[0];
    if(flipped) exportWindowBodyToMetro(window);
    else retrieveWindowBodyFromMetro(window);
    return flipped;
}

const toggleOverlay = bodyCrawler.overlay.classList.toggle.bind(bodyCrawler.overlay.classList, "open"); // The force attribute gets automatically forwarded!


toggleOverlay(true);
// overlay.style./
let timeout;
let loaded = false;
document.getElementById("desktop").ontransitionend  = function(){
    // console.log("I s zwear we are flip now and oly once! kanobi")
    if(!loaded){
    
    clearTimeout(timeout);
    timeout = setTimeout(function(){
        // toggleOverlay.bind(this, false)
        toggleOverlay(false);
        loaded = true
        //document.getElementById("desktop").ontransitionend = null;
    }, 500);
}
    
    if (window.matchMedia('only screen and (max-width: 300px), (pointer:none), (pointer:coarse)').matches) {
        console.log("flipped to mobile!")
    }
}

function initializeWindows(windows){
    document.onmouseup = activateWindowPointers;
    const flimminonce = false;
    
    //document.onmousemove = windowDragEvent; // I'm going to step back from keeping this always active to speed things up by doing calculations on window activation and deactivation.
    dragAction.set(0);
    flip();
    const dialogs = bodyCrawler.getAllDialogs();
    dialogs.forEach(function(dialog){
        windows[String(dialog.id)] = new Dialog(dialog); // Enable the close button. We are doing these things in JavaScript for if someone has JavaScript disabled.
    });
    loadWindowState();
    //toggleReflections();
}
// Normally we use const in for in loops!
// I am using let for Internet Explorer 11 and other old browsers that create one instance of the looping variable and assign a new value to the same variable instead of creating a new one every time. This can cause problems if we use const because you can't assign to a const! It also limits us from using that variable in the loop for "higher order" functions, also known as delegates or callbacks, since the same variable gets modified on these browsers.

function windowActivationEvent(event){
    /**
     * Activates the window on which the provided event was fired.
     * @function windowActivationEvent()
     * @property event
     */
    const dialog = getEventDialog(event);
    activeWindow = dialog.id;
    resizeDirection = 0;
    disableWindowPointers();
    const mouse = {x: event.clientX || 0, y:  event.clientY || 0};
    windows[activeWindow].setClickOffset(mouse.x, mouse.y);
    windows[activeWindow].activate();
    return dialog;
}

function windowDragEvent(event){
    try {
        const dialog = windows[activeWindow], difference = IE11Booster? dragAction.execute(dialog, dialog.clickOffset, {x: event.clientX - dialog.clickOffset.x, y: event.clientY - dialog.clickOffset.y}, dialog.target.style):
        dialog.dragCalculator.update({x: event.clientX, y: event.clientY});

        if(dialog.width < dialog.minWidth) dialog.width = dialog.minWidth;
        if(dialog.height < dialog.minHeight) dialog.height = dialog.minHeight;
        
        if(dialog.moveEvents) dialog.exchangeWindowMoveEvent(difference);
    } catch (ex) {
        console.error(ex);
    }
}

function activateWindowPointers(){
    document.removeEventListener("mousemove", windowDragEvent);
    dragAction.set(0);
    for(let index in windows) windows[index].togglePointerEvents(true);
    if(canSave) saveWindowState(); // We slaan hier onze configuratie van de vensters op. Dit word altijd uitgevoerd wanneer een venster neergezet word, op deze manier moeten we niet onnodig veel schrijven naar het browsergebeugen. On IE based browsers we don't have storage access when opening from a file! This is for security reasons, but modern browsers run in more secure sandboxes so don't need this anymore.
    if(windows[activeWindow]){
        if(windows[activeWindow].moveEvents) windows[activeWindow].exchangeWindowMouseUpEvent();
        if(IE11Booster) dragAction.set(0);
        else windows[activeWindow].dragCalculator.set(0);  // We overwrite the drag on click event now! This saves an if statement, the need to clear and makes the drag start from the actual point the mouse was pressed;
    }
    activeDrag = false;
}

function disableWindowPointers(){
    document.addEventListener("mousemove", windowDragEvent);
    for(let index in windows) windows[index].togglePointerEvents(false);
}

function updateTopZ(){
    for(let window in windows) if(windows[window].z > topZ) topZ = windows[window].z;
}

function stringifyWindowProperties(properties){
    return JSON.stringify(properties).replace(/true/g, "yes").replace(/false/g, "no").replace(/:/g, '=').replace(/}|{|"/g, '');
}

function getDialogBody(target){ // I am specifically not using querySelector in case we want an actual HTMLElement reference instead of a node! QuerySelector may be faster but I'm not using this function in time sensitive operations like the window drag, so I prefer functionality instead. The most left is the most recent revision. I removed the deprecated ones but if I make even more changes to the design of the dialogs I'll have to clean it up again or it'll get too long. We theoretically only need one, so as soon as I rebuilt all dialogs it can be simplified to one.
    return target.getElementsByTagName("content")[1] || target.getElementsByTagName("section")[1] || target.querySelector("article") || target.getElementsByClassName("client")[0] || target.getElementsByTagName("iframe")[0] || target.getElementsByTagName("section")[1] || target.getElementsByClassName("body")[0] || target.children[2];//&&&&&&&&&&&&&;
}

function getViewboxPosition(){
    return { left: window.screenLeft, top: window.screenTop }
}

function getObjectDialog(object){ // Alternatieve methode aan recursief het evenement af te gaan zou zijn door over de elementsFromPoint stack te lopen.
    if(["DIALOG", "BODY", "HTML", "HEAD"].indexOf(object.tagName)!=-1) return object;
    else if(object.target) return getObjectDialog(object.target);
    else return getObjectDialog(object.parentElement);
}

function getEventDialog(event){ // Hier is dus die alternatieve modus, maar hij lijkt soms last te hebben op IE11.
    if (fasterWindowTracking && event.clientX && event.clientY) try {
        return document.elementsFromPoint(event.clientX, event.clientY).find(function(element){ return element.nodeName == "DIALOG" });
    } catch (ex) { console.error(ex) }
    return getObjectDialog(event);
}

function toPixels(value){
    return Math.round(value) + "px"; // This is why Chrome was jiggling around! I noticed it was rounding off the positions of the contained elements separately but if we round the total prosition it aligns properly to the pixel grid! Nevermind it's sitll broken... Come on chrome! It's working a lot better and you can only notice the 1px offsets if you look closely. Firefox, Internet Explorer and Edge do not have this issue at all! Actually now this issue is completely gone, even on Chrome I see absolutely no sign of the body shifting around. Might be thanks to the 5th restructuring of the dialog body.
}

function pixelsToCentimeters(pixels){
    return (pixels * 2.54 / 96) * (window.devicePixelRatio || 1);
}

function fromPixels(text){
    if(text!=null) try{ return typeof text === 'number' ? text : parseInt(text.replace("px", '')) }
    catch (ex) { return text }
    else return 0;
}

function synchroniseWindowState(window){
    window = this || window;
    if(window.x) window.target.style.left = toPixels(window.x);
    if(window.y) window.target.style.top = toPixels(window.y);
    if(window.z) window.target.style.zIndex = window.z;
    if(window.width) window.target.style.width = toPixels(window.width);
    if(window.height) window.target.style.height = toPixels(window.height);
}

// Onderdeel van de aller eerste window move event handler.
function contains(array, number){
    return Boolean(array.indexOf(number) + 1);
}

function verifyEjectCapability(dialog){
    try{
        if(dialog.getElementsByTagName("iframe")[0].contentWindow.location.href == null) dialog.getElementsByTagName("button")[0].style.display = "none";
    }
    catch (exception){
        dialog.getElementsByTagName("button")[0].style.display = "none";
    }
}

function toggleBlur(enabled){
    if (enabled == null) document.body.toggleAttribute("blur");
    else document.body.toggleAttribute("blur", enabled);
}

function collectEssentialWindowData(target, source){
    return target.isOpen = source.isOpen, target.z = source.z, target.x = fromPixels(source.x), target.y = fromPixels(source.y), target.width = fromPixels(source.width), target.height = fromPixels(source.height), target;
}

function saveWindowState(){
    // console.warn("SAVING!")
    if(canSave && localStorage) try {
        const windowState = {};
        for (let id in windows) windowState[id] = collectEssentialWindowData({}, windows[id]);
        localStorage.setItem("windowState", JSON.stringify(windowState));
        // console.log(windowState)
        // localStorage.windowState = JSON.stringify(windowState); // I had apparently used the wrong syntax by accident but this way of getting and setting works too for some reason. It's probably supposed to work this way too but I don't know what the correct way is.
    } catch(exception) {
        console.error(exception);
        console.warn("A problem occurred, window state saving has been disabled for this session! The stored window state will be reset in an attempt to recover from this issue.");
        console.log("If you wish to save the window state before reset, copy this and put it somewhere else:", localStorage.windowState);
        // localStorage.windowState = null; 
        localStorage.windowState = null; 
        canSave = false;
    }
}

function loadWindowState(){
    if(canSave) try {
        if(localStorage && localStorage.windowState){
            const parsedWindows = JSON.parse(localStorage.windowState), fails = [];
            for (let window in parsedWindows) try{
                collectEssentialWindowData(windows[window], parsedWindows[window]).synchronise(); // I made the collect function return the target so we can write this in one line.
            } catch(ex) {
                fails.push(ex);
            }
            updateTopZ();
        }
    } catch(exception) {
        console.error(exception);
        console.warn("Something went wrong! The stored window state will be reset in an attempt to recover from this issue.");
        console.log("If you wish to save the window state before reset, copy this and put it somewhere else:", localStorage.windowState);
        localStorage.windowState = null;
        canSave = false;
    } else console.error("Storage access is disabled for this session!");
}

function exportWindowBodyToMetro(window){
    if(window){ // On modern browsers we can use the new shadow DOM in combination with slots to prevent iframes from firing a load event causing it to lose its state after being moved. On IE 9 and below it does not fire a reload for iframes, this functionality is inconsistent. Other option is css.
        const metro = bodyCrawler.getMetro();
        window.close();
        if(metro) metro.appendChild(window.body);
    }
}

function retrieveWindowBodyFromMetro(dialog){
    const metroBody = bodyCrawler.getMetroBody();
    console.log("knars ar", dialog, metroBody)
    if (dialog && metro) dialog.launch(metroBody);
}

function getDialogTemplate(){
    return (document.querySelector("template").content || document.getElementsByTagName("template")[0]).children[0];//document.querySelector("template");
}

// Class to build dialogs that can be passed to the Window insertion API. Not finished, window construction objects have to be designed and built by hand for now!
function DialogBuilder(title, id){
    this.title = title;
    this.id = id;
    this.target;
    this.createDialog = function(){ return this.target = bodyCrawler.getWindowsContainer().appendChild(removeComments(getDialogTemplate().cloneNode(true))); };
}

function createDialog(){
    return bodyCrawler.getWindowsContainer().appendChild(removeComments(getDialogTemplate().cloneNode(true)));
}

function removeComments(element){ // Removes the comments of an HTMLElement based object.
    element.childNodes.forEach(function(child){
        if (child.nodeName=="#comment") element.removeChild(child);
        else removeComments(child);
    });
    return element;
}

function toggleCharms(force){
    document.getElementsByTagName("aside")[0].classList.toggle("open", force);
}

function hexToRGB(hex){
    const int = parseInt(hex.replace('#', ''), 16);
    return {r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255};
}

function isColorDark(color){
    const rgb = hexToRGB(color);
    return 0.2126*rgb.r + 0.7152*rgb.g + 0.0722*rgb.b < 128;
}

function setColor(color){
    const rgb = hexToRGB(color);
    // const y = 0.2126*rgb.r + 0.7152*rgb.g + 0.0722*rgb.b;
    // const c = y < 128 ? "black" : "white";
    const isWhite = isColorDark(color);
    for(let index in windows){
        const content = windows[index].target.getElementsByTagName("content")[0];
        content.style.backgroundColor = color;
        content.style.color = isWhite?"white":"black";
    }
}

function setAccentColor(color){
    const isWhite = isColorDark(color);
    const metroStyle = document.getElementById("metro").style, charmStyle = document.getElementById("charms").style;
    metroStyle.backgroundColor = charmStyle.backgroundColor = color;
    metroStyle.color = charmStyle.color = isWhite?"white":"black";
    // document.getElementById("metro").style.backgroundColor = document.getElementById("charms").style.backgroundColor = color;;

}

function injectApplication(application){
    windows[demo.id] = new Dialog(application); // The Dialog class takes care of anything passed to it and tries to compile a dialog from the given data. This can be an HTMLElement or an object with each the correct structure.
    loadWindowState();
}

function injectApplications(applications){
    applications.forEach(function(application){ windows[demo.id] = new Dialog(application) }); // Awwor notation: applications.forEach(application => windows[demo.id] = new Dialog(application));
    loadWindowState();
}

initializeWindows(windows);
toggleReflections(reflections);

/*\ The purpose is for this website to be functional on every browser that's less than or a decade old. I created my own polyfills for some functions that don't exist in ES5, so performance on ES6 browsers is expected to be better.
 * \  Tested and confirmed functional (can work on stuff I haven't tested too.):
 *  \  Chrome for Android Chrome targetting 36 and up.
 *   \  FireFox 115 ESR and up (should work on any version that's less than 10 years old, or at least has ES5 support (2009))
 *    \  Chromium 118 (That means Chrome, Edge Chromium, Brave, Opera, ...)
 *    /  ToDo: Test on Safari on Mac OS 10.7 Lion and 10.15 Catalina when I have time to do so. Same goes for Firefox and Chrome versions that I have installed on these systems. From the tests in Windows 8.1 I expect this to work fine!
 *   /  Internet Explorer 11
 *  /  Chrome 48
 * /  EdgeHTML 18 (Edge Legacy)
\*/
