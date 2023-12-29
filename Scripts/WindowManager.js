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
const windows = {}; // MDN says not to use "new Object();". W3Schools adds to it that {} is faster and more readable.
const windowButtons = {
    eject: 0,
    full: 1,
    close: 2
};
let activeWindow = null;
let activeDrag = false;
let resizeDirection = 0;
let topZ = 100;
let canSave = true;

function flip(enable){
    //if(enable == null)
    const flipped = document.getElementById("desktop").toggleAttribute("flipped", enable);
    const window = windows[activeWindow] || windows[0];
    if(flipped) exportWindowBodyToMetro(window);
    else retrieveWindowBodyFromMetro(window);
}

flip();

function initializeWindows(windows){
    /**
     * Initializes the windows inside the windows object.
     */
    const dialogs = document.getElementsByTagName("dialog");
    for (let index = 0; index < dialogs.length; index++) {
        const dialog = dialogs[index];
        console.log(dialog, dialog.id, dialog.src)
        const window = windows[dialog.id] = new Dialog(dialog);
        window.toggleCloseButton(true); // Enable the close button. We are doin these things in JavaScript for if someone has JavaScript disabled.
        window.toggleButton(windowButtons.full, true);
    }
}

initializeWindows(windows);

// Normally we use const in for in loops.
// I am using let for Internet Explorer 11 and other old browsers that create one instance of the looping variable and assign a new value to the same variable instead of creating a new one every time.
for (let windowId in windows) {
    const dialog = windows[windowId];
    const target = dialog.target;
    const body = getDialogBody(target);
    const borderSection = target.getElementsByTagName("section")[0];

    if(borderSection) for (let index = 0; index < 8; index++) {
        const div = document.createElement("div");
        div.draggable = false;
        div.id = index + 1;
        div.onmousedown = function(ev){
            resizeDirection = parseInt(ev.target.id); // You can also put index + 1 in here instead for optimal efficiency and minimalism, but Internet Explorer is a very stubborn browser and does not instantiate the index variable but keeps one in memory resulting in resize direction being 9. Despite this it uses very little memory compared to Firefox and Chrome?
            windowActivationEvent(ev);
        };
        target.appendChild(div);
    }
    
    verifyEjectCapability(target);

    body.addEventListener("load", function(event){
        try {
            verifyEjectCapability(getEventDialog(event));
        } catch (exception){
            target.getElementsByTagName("button")[0].style.display = "none";
        }
    });
    
    target.addEventListener("mousedown", function(event){
        const dialog = getEventDialog(event);
        if(dialog && dialog.tagName == "DIALOG") windowActivationEvent(event);
    });


    target.getElementsByTagName("button")[windowButtons.eject].addEventListener("click", function(event){
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
    console.log(buttons);
    if(buttons[windowButtons.close]) buttons[windowButtons.close].addEventListener("click", function(event){
        const dialog = getEventDialog(event);
        dialog.open = false;
        dialog.removeAttribute("open");
    });
    if(buttons[windowButtons.full]) buttons[windowButtons.full].addEventListener("click", function(event){
        const style = windowActivationEvent(event).style;
        style.top = 0,
        style.left = 0,
        style.right = 0,
        style.bottom = 0,
        style.width = "unset",
        style.height = "unset";
    });
}

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
    for (let windowId in windows) { windows[windowId].togglePointerEvents(false);
    }
    return dialog;
}

function activateWindowPointers(){
    for (let window in windows) windows[window].togglePointerEvents(true);
    
    resizeDirection = 0, activeDrag = false;
    if(canSave) saveWindowState(); // We slaan hier onze configuratie van de vensters op. Dit word altijd uitgevoerd wanneer een venster neergezet word, op deze manier moeten we niet onnodig veel schrijven naar het browsergebeugen.
}

function disableWindowPointers(){
    for (let window in windows) windows[window].togglePointerEvents(false);
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

function getDialogBody(target){
    return target.getElementsByTagName("content")[1] || target.getElementsByTagName("section")[1] || target.querySelector("article") || target.getElementsByClassName("client")[0] || target.getElementsByTagName("iframe")[0] || target.getElementsByTagName("section")[1] || target.getElementsByClassName("body")[0] || target.children[2];//&&&&&&&&&&&&&;
}

function getViewboxPosition(){
    return {
        left: window.screenLeft,
        top: window.screenTop
    }
}

function getObjectDialog(object){ // Alternatieve methode aan recursief het evenement af te gaan zou zijn door over de elementAt stack te lopen.
    if(["DIALOG", "BODY", "HTML", "HEAD"].indexOf(object.tagName)!=-1) return object;
    else if(object.target) return getObjectDialog(object.target);
    else return getObjectDialog(object.parentElement);
}

function getEventDialog(event){ // Alternatieve methode aan recursief het evenement af te gaan zou zijn door over de elementAt stack te lopen.
    //let dialog;
    if (event.clientX && event.clientY) try { //console.log(event.clientX, event.clientY);
        return document.elementsFromPoint(event.clientX, /*400*/event.clientY).find(function(element){ return element.nodeName == "DIALOG" });
    } catch (ex) { console.error(ex) }
    return getObjectDialog(event);
}//return document.elementsFromPoint(400, 400).find(function(element)=>element.nodeName == "DIALOG")

const contstrained = true;

function windowDragEvent(event){
    //const timer = new Timer();
    if(activeDrag && activeWindow && event.buttons == 1) {
        const dialog = windows[activeWindow];
        const mouse = {x: event.clientX, y:  event.clientY};
        const offset = dialog.clickOffset;

        if(!offset || !offset.x|| !offset.y){
            const rect = dialog.getRect();            
            offset.x = mouse.x;
            offset.y = mouse.y;
            offset.height = dialog.height || rect.height;
            offset.width = dialog.width || rect.width;
            offset.top = rect.top;
            offset.left = rect.left;
            offset.stats.reset();
        }

        //offset.stats.last = Date.now();
        const scroll = {x: window.scrollX || 0, y: window.scrollY || 0};
        const difference = {x: mouse.x - offset.x, y: mouse.y - offset.y};
        const style = dialog.target.style;

        //console.log(resizeDirection, offset.height + difference.y);
        if(contains([4, 5, 8, 0], resizeDirection)) style.left = toPixels(dialog.x = offset.left + difference.x + scroll.x);
        if(contains([4, 5, 8], resizeDirection)) style.width = toPixels(dialog.width = offset.width - difference.x);
        if(contains([3, 7, 8], resizeDirection)) style.height = toPixels(dialog.height = offset.height + difference.y);
        if(contains([2, 7, 6], resizeDirection)) style.width = toPixels(dialog.width = offset.width + difference.x);
        if(contains([1, 5, 6], resizeDirection)) style.height = toPixels(dialog.height = offset.height - difference.y);
        if(contains([1, 5, 6, 0], resizeDirection)) style.top = toPixels(dialog.y = offset.top + difference.y + scroll.y);
        
        if(dialog.width < 0) dialog.width = 0;
        if(dialog.height < 0) dialog.height = 0;
        
        if(false) dialog.exchangeWindowMoveEvent(offset.stats.update(difference.x, difference.y));
        //console.log(timer.start, timer.elapsed());
    }
    //console.log(timer.elapsed());
}

function Timer(){
    this.start = Date.now(),
    this.elapsed = function(){
        return Date.now() - this.start;
    }
}

//document.addEventListener("mouseup", reactivateWindowPointers);

function toPixels(value){
    return Math.round(value) + "px"; // This is why Chrome was jiggling around! I noticed it was rounding off the positions of the contained elements separately but if we round the total prosition it aligns properly to the pixel grid! Nevermind it's sitll broken... Come on chrome! 
}

function fromPixels(text){
    return parseInt(text.replace("px", ''));
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
    document.getElementsByTagName("body").toggleAttribute("blur", enabled);
}

function saveWindowState(){
    if(canSave) try {
        if(localStorage) localStorage.windowState = JSON.stringify(windows);
    } catch(exception) {
        console.error(exception);
        canSave = false;
    }
}

function loadWindowState(){
    if(canSave) try {
        if(localStorage && localStorage.windowState){
            const parsedWindows = JSON.parse(localStorage.windowState);
            console.log("knars knaaaaaars!!", parsedWindows);
            for (let window in parsedWindows) {
                console.log(windows[window].x, parsedWindows[window].x);
                windows[window].x = parsedWindows[window].x;
                windows[window].y = parsedWindows[window].y;
                windows[window].width = parsedWindows[window].width;
                windows[window].height = parsedWindows[window].height;
                windows[window].synchronise();
            }
            updateTopZ();
        }
    } catch(exception) {
        console.error(exception);
        canSave = false;
    }
    else {
        console.error("Storage access is disabled for this session!");
    }
}

loadWindowState();

function exportWindowBodyToMetro(window){
    if(window){
        const metro = document.getElementById("metro");
        if(metro) metro.appendChild(window.body);
    } //else if()
}

function retrieveWindowBodyFromMetro(window){
    const metro = document.getElementById("metro");
    if(window && metro)window.content.appendChild(metro.firstChild);/*{
        //for (let index in window.body.children) metro.appendChild(window.body.children[index]);
        window.content.appendChild(metro.firstChild);
    }*/
}

function getMetroBody(){
    return document.getElementById("metro").firstChild;
}

function Dialog(dialog){ // Verouderde manier om een object constructor te maken. Tegenwoordig gebruiken we klassen, maar ik doe het hier nog zo voor compatibiliteit met ES5.
    /**
     * Creates an instance of a Dialog that allows the Dialog be resized and moved around.
     * @author Lasse Lauwerys
     * @param {Element} dialog This is a dialog element from the HTML structure.
     */
    
    this.target = dialog,
    
    this.getBody = function(){
        return this.content.children[1];
    },

    this.getContent = function(){
        return this.target.getElementsByTagName("content")[0];
    }

    this.getHead = function(){
        return this.target.getElementsByTagName("header")[0];
    },

    this.content = this.getContent();
    this.body = this.getBody(), // An effort to trade memory for performance.
    this.head = this.getHead(),
    this.src = "",
    this.title = "Window",
    this.getFrame = function(){
        return this.target.getElementsByTagName("iframe")[0];
    },

    this.frame = this.getFrame(),
    this.clickOffset = {
        x: 0, y: 0,
        height: 0, width: 0,
        start: {x: 0, y: 0},
        stats: {
            start: 0,
            last: 0,
            difference: {
                x: 0,
                y: 0
            },
            // De nieuwe manier reset(){} zou moeten toegepast worden, maar I am doing it the inappropriate way for compatibility with Internet Explorer 11.
            reset: function(){
                this.start = Date.now(), this.last = this.start, this.difference.x = 0, this.difference.y = 0;
                return this;
            },
            update: function(x, y){
                this.last = Date.now(), this.difference.x = x, this.difference.y = y;
                return this;
            }
        }
    },
    this.x = 0,
    this.y = 0,
    this.z = 0,
    this.width = 0,
    this.height = 0,
    this.synchronise = synchroniseWindowState,
    this.open = function(){
        this.target.createAttribute("open");
    }
    this.close = function(){
        this.target.removeAttribute("open");
    }
    this.getButton = function(index){
        //console.log(this.head)
        return this.head.getElementsByTagName("button")[index];
    }
    this.toggleButton = function(buttonId, enable){
        const button = this.getButton(buttonId);
        if(button) button.toggleAttribute("disabled", enable);
        //if(button && (enable == null || button.hasAttribute("disabled") === enable)) button.toggleAttribute("disabled");
    }
    this.toggleCloseButton = function(enable){
        this.toggleButton(windowButtons.close, enable);
    }

    this.toggleEjectButton = function(enable){
        this.toggleButton(windowButtons.eject, enable);
    }

    this.togglePointerEvents = function(enable){
        if(enable == null) enable = this.target.style.pointerEvents == "none";
        this.clickOffset.x = null, this.clickOffset.y = null, this.target.style.pointerEvents = this.body.style.pointerEvents = enable ? "auto" : "none";
        //console.log(this.frame)
        if(this.frame) {
            this.frame.style.pointerEvents = this.target.style.pointerEvents;
            //if(enable) this.frame.style.zIndex = 0;
            //else this.frame.style.zIndex = -1;
        } else this.frame = this.getFrame();
        
    }

    this.getRect = function(index){
        //if(index == null) index = 0;
        return this.target.getClientRects()[index == null? 0: index];
    }

    this.exchangeWindowMoveEvent = function (stats){ // Async is not supported in IE11?!? I chose some async since we don't need the return value and I need the window move to be as fast as possible.
        if(this.frame) this.frame.contentWindow.postMessage('hello', '*');
    }
}

/*\
 * \  Tested and confirmed functional:
 *  \  Chrome and all other Chromium based browsers versions 118 and up (will check lower versions down to 48 later on Windows 8.1 and 7, Android Chrome I might test down to version but targetting 36 and up), Internet Explorer 11, EdgeHTML 18.
 *   \  FireFox 115 ESR and up
 *    \ Chromium 118 (That means Chrome, Edge, Brave, Opera, ...)
 *    / FireFox
 *   / Internet Explorer 11
 *  / Chrome 48
 * /
\*/