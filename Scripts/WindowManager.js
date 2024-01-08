
/*\
   \________
   / ______/\                                            \\
  / /     /\ \    LWM (Lasse's Window Manager)            \\
 /_/_____/  \ \   Targetting: ES5 (+ Self made extensions) \\
 \ \     \  / /   Copyright: Lasse Lauwerys © 2023         //
  \ \_____\/ /    Created: 17/12/2023                     //
   \_______\/                                            //
   /
\*/

'use strict'; // Strict mode is required for older versions of Chrome (tested on 48).

// Settings

let blur = false;
let reflections = false;
let fasterWindowTracking = false;

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
let canSave = true;
let IE11Booster = true;

dragAction.set(0);


function OSDocumentCrawler(document){
    this.document = document;
    this.getDesktop = function(){
        return this.document.getElementById("desktop");
    }
    this.getAllDialogs = function(){
        return this.document.getElementsByTagName("dialog");
    }
    this.getMetro = function(){
        return this.document.getElementById("metro");
    }
    this.getMetroBody = function(){
        return this.getMetro().firstChild;
    }
    this.getWindowsContainer = function(){
        return this.document.getElementById("windows");
    }
}

let bodyCrawler = new OSDocumentCrawler(document);

function flip(enable){
    //if(enable == null)
    //const flipped = enable == null ? bodyCrawler.getDesktop().toggleAttribute("flipped") : bodyCrawler.getDesktop().toggleAttribute("flipped", enable);
    const flipped = bodyCrawler.getDesktop().toggleAttribute("flipped", enable);
    const window = windows[activeWindow] || windows[0];
    if(flipped) exportWindowBodyToMetro(window);
    else retrieveWindowBodyFromMetro(window);
    return flipped;
}

flip();

function initializeWindows(windows){
    /**
     * Initializes the windows inside the windows object.
     */
    const dialogs = bodyCrawler.getAllDialogs();
    dialogs.forEach(function(dialog){
        windows[String(dialog.id)] = new Dialog(dialog);
         // Enable the close button. We are doin these things in JavaScript for if someone has JavaScript disabled.
    });
}

function findTopWindow(){
    windows.forEach(function(window){

    });
}

initializeWindows(windows);

// Normally we use const in for in loops.
// I am using let for Internet Explorer 11 and other old browsers that create one instance of the looping variable and assign a new value to the same variable instead of creating a new one every time.

document.addEventListener("mouseup", activateWindowPointers);
document.addEventListener("mousemove", windowDragEvent);

function windowActivationEvent(event){
    /**
     * Activates the window on which the provided event was fired.
     * @function windowActivationEvent()
     * @property event
     */
    const dialog = getEventDialog(event);
    dialog.style.zIndex = topZ++;
    activeDrag = true;
    activeWindow = dialog.id;
    resizeDirection = 0;
    dragAction.set(0);
    windows[activeWindow].dragCalculator.set(0);
    disableWindowPointers();
    const mouse = {x: event.clientX || 0, y:  event.clientY || 0};
    windows[activeWindow].setClickOffset(mouse.x, mouse.y);
    return dialog;
}

function DragCalculator(dialog){ // This is the 4th iteration of optimising the window drag calculations. This is a little bit slower than the previous version but it's far cleaner and more easy to modify so I can add constraints.
    this.dialog = dialog;
    this.offset = dialog.clickOffset;
    this.style = dialog.target.style;
}

DragCalculator.prototype.__proto__ = {
    set: function(direction){ this.update = this.operations[direction] },
    get top(){ return (this.dialog.y = this.offset.top + this.difference.y) + "px" },
    get left(){ return (this.dialog.x = this.offset.left + this.difference.x) + "px" },
    get width(){ return (this.dialog.width = this.offset.width + this.difference.x) + "px" },
    get height(){ return (this.dialog.height = this.offset.height + this.difference.y) + "px" },
    get widthrv(){ return (this.dialog.width = this.offset.width - this.difference.x) + "px" },
    get heightrv(){ return (this.dialog.height = this.offset.height - this.difference.y) + "px" },
    get difference() { return this._difference },
    set difference(pos) { return this._difference.x = pos.x - this.offset.x, this._difference.y = pos.y - this.offset.y },
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
}// This comma must have been it...

function DragAction(){ // This looks less elegant than checking on mouse move but if we simply define the function in advance we save quite a lot of performance by doing the resize method calculations in advance instead on every mouse move tick. I also intentionally split the code up again so we do have duplicate code but in this case it's far more efficient to do 1 function call with 0 if statements than doing 16 function calls with 3 * 6 + 2 if statements for each direction on every mousemove event! Even the visually pleasing but technically sluggish method works relatively smoothly on modern browsers, it gets quite horrible once reflections and blur are enabled, these effects are done by native code in the browser and we can't optimise that so I did my best to make this as efficient as I could come up with. Performance is absolutely necessary because we want the window dragging to feel instantaneous, lag is absolutely not tolerated even on slow hardware and deprecated browsers!
    this.execute = function(){};
    this.set = function(direction){ if(!activeDrag) activeDrag = true, this.execute = this.resizeFunctions[direction] || function(){} };
    this.remove = function(){ activeDrag = false };
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
        function(){}
    ];
}

function activateWindowPointers(){
    for(let index in windows) windows[index].togglePointerEvents(true);
    if(canSave) saveWindowState(); // We slaan hier onze configuratie van de vensters op. Dit word altijd uitgevoerd wanneer een venster neergezet word, op deze manier moeten we niet onnodig veel schrijven naar het browsergebeugen. On IE based browsers we don't have storage access when opening from a file! This is for security reasons, but modern browsers run in more secure sandboxes so don't need this anymore.
    if(windows[activeWindow].moveEvents) windows[activeWindow].exchangeWindowMouseUpEvent();
    if(IE11Booster) dragAction.set(0);
    else windows[activeWindow].dragCalculator.set(0);  // We overwrite the drag on click event now! This saves an if statement, the need to clear and makes the drag start from the actual point the mouse was pressed;
    activeDrag = false;
    dragAction.set(0)
}

function disableWindowPointers(){
    //console.log(dragAction.execute)
    for(let index in windows) windows[index].togglePointerEvents(false);
}

function updateTopZ(){
    for(let window in windows) if(windows[window].z > topZ) topZ = windows[window].z;
}

function getWindowClient(window){
    window.target.getElementsByTagName("iframe")[0];
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

const contstrained = true;

function windowDragEvent(event){
    if(activeDrag && activeWindow!=null && event.buttons == 1) {
        //console.time("hey")
        const dialog = windows[activeWindow];//, difference = {x: event.clientX - dialog.clickOffset.x, y: event.clientY - dialog.clickOffset.y};
        const difference = IE11Booster? dragAction.execute(dialog, dialog.clickOffset, {x: event.clientX - dialog.clickOffset.x, y: event.clientY - dialog.clickOffset.y}, dialog.target.style):
        dialog.dragCalculator.update({x: event.clientX, y: event.clientY});
        if(dialog.width < 0) dialog.width = 0;
        if(dialog.height < 0) dialog.height = 0;
        
        if(dialog.moveEvents) {
            //console.log(difference)
            dialog.exchangeWindowMoveEvent(difference);
        }
        //console.timeEnd("hey")
    } else activeDrag = false;
}

function Timer(){
    this.start = Date.now(),
    this.elapsed = function(){
        return Date.now() - this.start;
    }
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
    if(window.width) window.target.style.width = toPixels(window.width);
    if(window.height) window.target.style.height = toPixels(window.height);
}

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
    return target.x = fromPixels(source.x), target.y = fromPixels(source.y), target.width = fromPixels(source.width), target.height = fromPixels(source.height), target;
}

function saveWindowState(){
    if(canSave) try {
        if(localStorage){
            const windowState = {};
            for (let id in windows) windowState[id] = collectEssentialWindowData({}, windows[id]);
            localStorage.windowState = JSON.stringify(windowState);
        }
    } catch(exception) {
        console.error(exception);
        console.warn("A problem occurred, window state saving has been disabled for this session! The stored window state will be reset in an attempt to recover from this issue.");
        console.log("If you wish to save the window state before reset, copy this and put it somewhere else:", localStorage.windowState);
        localStorage.windowState = null
        canSave = false;
    }
}

function loadWindowState(){
    if(canSave) try {
        if(localStorage && localStorage.windowState){
            const parsedWindows = JSON.parse(localStorage.windowState), fails = [];
            for (let window in parsedWindows) {
                //console.log(windows[window].x, parsedWindows[window].x);
                try{
                    collectEssentialWindowData(windows[window], parsedWindows[window]);
                    windows[window].synchronise();
                } catch(ex) { fails.push(ex) }
            }
            updateTopZ();
        }
    } catch(exception) {
        console.error(exception);
        console.warn("Something went wrong! The stored window state will be reset in an attempt to recover from this issue.");
        console.log("If you wish to save the window state before reset, copy this and put it somewhere else:", localStorage.windowState);
        localStorage.windowState = null;
        canSave = false;
    } else {
        console.error("Storage access is disabled for this session!");
    }
    //console.log(fails.length + "fialed atmeptpttptps retteketet")
}

loadWindowState();

function exportWindowBodyToMetro(window){
    if(window){ // On modern browsers we can use the new shadow DOM in combination with slots to prevent iframes from firing a load event causing it to lose its state after being moved. On IE 9 and below it does not fire a reload for iframes, this functionality is inconsistent. Other option is css.
        const metro = bodyCrawler.getMetro();
        window.close();
        if(metro) metro.appendChild(window.body);
    }
}

function retrieveWindowBodyFromMetro(window){
    const metroBody = bodyCrawler.getMetroBody();
    if (window && metro) window.open(metroBody);
}

function getDialogTemplate(){
    return (document.querySelector("template").content || document.getElementsByTagName("template")[0]).children[0];//document.querySelector("template");
}

function DialogBuilder(title, id){
    this.title = title;
    this.id = id;
    this.target;
    this.createDialog = function(){ return this.target = bodyCrawler.getWindowsContainer().appendChild(removeComments(getDialogTemplate().cloneNode(true))); };
}

function createDialog(){
    return bodyCrawler.getWindowsContainer().appendChild(removeComments(getDialogTemplate().cloneNode(true)));
}

function removeComments(element){
    element.childNodes.forEach(function(child){
        if (child.nodeName=="#comment") element.removeChild(child);
        else removeComments(child);
    });
    return element;
}

function Dialog(object){ // Verouderde manier om een object constructor te maken. Tegenwoordig gebruiken we klassen, maar ik doe het hier nog zo voor compatibiliteit met ES5.
    /**
     * Creates an instance of a Dialog that allows the Dialog be resized and moved around.
     * @author Lasse Lauwerys
     * @param {Element} dialog This is a dialog element from the HTML structure.
     */

    //if(!this.open) setDialogPrototype();
    if(!object) return;
    const dialog = this;
    this.setTitle = function(title){ return this.getTitleElement().innerText = title },
    this.getTitleElement = function(){ return this.getHead().querySelector("h1") },
    this.getContent = function(){ return this.target.getElementsByTagName("content")[0] },
    this.getFrame = function(){ return this.frame = this.target.getElementsByTagName("iframe")[0] || document.createElement("iframe") },
    this.getTitle = function(){ return this.getTitleElement().innerText },
    this.getHead = function(){ return this.target.getElementsByTagName("header")[0] },
    this.getBody = function(){ return this.content.children[1] },
    this.close = function(){ return this.target.removeAttribute("open") },
    this.getId = function(){ return this.target.getAttribute("id") },
    this.setId = function(id){ return windows[id] = this, this.target.setAttribute("id", id) },
    this.open = function(){ return this.target.createAttribute("open") },
    this.getInnerRect = function(){ return {top: this.target.offsetTop, left: this.target.offsetLeft, right: this.target.offsetRight, bottom: this.target.offsetBottom, width: this.target.offsetWidth, height: this.target.offsetHeight} }, // This builds a rect without extra function calls and includes the dimension offsets caused by css transformations. This allows us to actually move the windows correctly WHILE the animation is playing. Try it out if you think you're fast enough (or change the animation speed),
    this.getRect = function(index){ return index == null? this.target.getBoundingClientRect(): this.target.getClientRects()[index] },
    this.getButton = function(index){ return this.head.getElementsByTagName("button")[index] },
    this.setClickOffset = function(x, y){ return this.clickOffset.x = x, this.clickOffset.y = y, this.clickOffset.height = window.height || this.target.offsetHeight, this.clickOffset.width = window.width || this.target.offsetWidth, this.clickOffset.top = this.target.offsetTop, this.clickOffset.left = this.target.offsetLeft, this.clickOffset.stats.reset() },
    this.togglePointerEvents = function(enable){ return this.target.style.pointerEvents = this.body.style.pointerEvents = (this.frame || this.getFrame()).style.pointerEvents = enable == null? this.target.style.pointerEvents == "none" : enable ? "auto" : "none" },
    this.toggleButton = function(buttonId, enable){ return this.getButton(buttonId).toggleAttribute("disabled", !enable) },
    this.clearClickOffset = function(){ this.clickOffset.clear() },
    this.toggleFullScreen = function(enable){ this.target.toggleAttribute("full", enable) },
    this.toggleCloseButton = function(enable){ this.toggleButton(windowButtons.close, enable) },
    this.toggleEjectButton = function(enable){ this.toggleButton(windowButtons.eject, enable) },
    this.toggleFullButton = function(enable){ this.toggleButton(windowButtons.full, enable) };

    // this.resize = function(width, height){
    //     this.target.style.width = (this.width = width) + "px",
    //     this.target.style.height = (this.height = height) + "px";
    // }

    this.move = function(x, y){
        this.target.style.left = (this.x = x) + "px",
        this.target.style.top = (this.y = y) + "px";
    }

    this.resize = function(width, height){
        this.target.style.width = (this.width = width) + "px",
        this.target.style.height = (this.height = height) + "px";
    }

    this.resizeBody = function(width, height){
        this.body.style.width = (this.width = width) + "px",
        this.body.style.height = (this.height = height) + "px",
        this.target.style.width = null,
        this.target.style.height = null;
    }

    this.messenger = new Messenger();
    const types = this.messenger.types;
    // window.onmessage = function(ev){
    //     const message = JSON.parse(ev.data);
    //     const data = message.data;
    //     const type = message.type;

    //     if(type === types.windowSize) {
    //         dialog.resize(data.width, data.height);
    //         console.log("EEE", type, data);
    //     }
    // }
    // this.messenger.onmessage = function(message){
    //     console.log("YO", message);
    // }

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
    }

    // this.messenger = new Messenger();
    // this.messenger.onmessage = function(message){
    //     console.log(message);
    // }
    
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.width = 0;
    this.height = 0;
    //object.nodeName == "DIALOG" ? // : this.frame = document.createElement("iframe"), this.src = object.src, object.target //|| createDialog();
    this.title = object.title || this.getTitle();
    this.id = object.id || this.getId() || this.title;
    this.moveEvents = object.moveEvents || false;
    this.content = this.getContent();
    //this.frame = object.src ?  = document.createElement("iframe") || this.getFrame();
    this.body = this.getBody(); // An effort to trade memory for performance.
    this.head = this.getHead();
    //this.src = object.src ? (this.frame = this.body.appendChild(document.createElement("iframe")), this.frame.src = object.src) : (this.frame = this.getFrame());
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
        clear: function(){ this.x = 0, this.y = 0 } // Modern way: clear(){}. I am doing it the old way for compatibility.
    },
    this.dragCalculator = new DragCalculator(this); // Watch out because this makes it circular! It also has to be defined after the properties the obect ,ee constructor needs.

    window.onmessage = function(ev){
        const message = JSON.parse(ev.data);
        const data = message.data;
        const type = message.type;

        if(type === types.windowSize) {
            dialog.resizeBody(data.width, data.height);
            console.log("EEE", type, data);
        }
    }

    if(!this.scroll) this.body.style.overflow = "hidden";

    this.verifyEjectCapability = function(){
        const style = this.getButton(windowButtons.eject).style;
        try { if(this.getFrame().contentWindow.location.href == null) style.display = "none" }
        catch (e){ style.display = "none" }
    }

    this.toggleCloseButton(true);
    this.toggleFullButton(true);
    if(this.verifyEjectCapability()) this.toggleEjectButton(true);

    this.synchronise = synchroniseWindowState;

    this.exchangeWindowMouseUpEvent = function(){
        this.messageFrame({difference:new Vector});
    }

    this.exchangeWindowMoveEvent = function (difference){ // Async is not supported in IE11?!? I chose some async since we don't need the return value and I need the window move to be as fast as possible.
        if(difference)this.messageFrame(dialog.clickOffset.stats.update(difference.x, difference.y));
    };

    this.messageFrame = function(object, literal){
        if(this.frame) this.frame.contentWindow.postMessage(literal?object:JSON.stringify(object), '*');
    }

    if(object.body) this.body.appendChild(object.body);
    this.setTitle(this.title);

    //const dialog = this, 
    const target = this.target, body = getDialogBody(target), borderSection = target.getElementsByTagName("section")[0];

    if(borderSection && !this.fixed) for (let index = 0; index < 8; index++) {
        const div = target.appendChild(document.createElement("div"));
        div.draggable = false, div.id = index + 1,
        div.onmousedown = function(ev){
            if(IE11Booster) dragAction.set(ev.target.id);
            else dialog.dragCalculator.set(ev.target.id);
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
        const dialog = getEventDialog(event);
        dialog.open = false;
        dialog.removeAttribute("open");
    });
    buttons[windowButtons.full].addEventListener("click", function(){dialog.toggleFullScreen()});
    windows[this.id] = this;
}

function injectApplication(application){
    windows[demo.id] = new Dialog(application);
    loadWindowState();
}

function injectApplications(applications){
    applications.forEach(function(application){
        windows[demo.id] = new Dialog(application);
    });
    loadWindowState();
}


/*\
 * \  Tested and confirmed functional:
 *  \  Chrome and all other Chromium based browsers versions 118 and up (will check lower versions down to 48 later on Windows 8.1 and 7, Android Chrome I might test down to version but targetting 36 and up), Internet Explorer 11, EdgeHTML 18.
 *   \  FireFox 115 ESR and up
 *    \  Chromium 118 (That means Chrome, Edge, Brave, Opera, ...)
 *    /  FireFox
 *   /  Internet Explorer 11
 *  /  Chrome 48
 * /
\*/
