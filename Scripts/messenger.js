  // iFrame <-> mainFrame LVMessenger
 // Lasse Lauwerys (c) 2026
// 8/1/2024 -> patch 11/1/2024, added origin identifier without CORS -> patch 01/02/2026, don't parse if not a string, did other stuff ya kno -> patch 08/03/2026, remove duplicate function

'use strict';
'use esnext';
'use moz';

function LVMessenger(){
}

LVMessenger.types = {
    open: "open",
    windowSize: "windowSize",
    windowMove: "windowMove",
    mouseUp: "mouseUp",
    launchOverlay: "launchOverlay",
    prepareToLaunchOverlay: "prepareToLaunchOverlay",
    readyToLaunchOverlay: "readyToLaunchOverlay",
    identify: "identify",
    identity: "identity"
};

/** @typedef {keyof typeof LVMessenger.types} MessageType */

/**
 * @typedef Identity
 * @prop {string} name
 */

/**
 * @typedef LVMessage
 * @prop {MessageType} type
 * @prop {*} data
 * @prop {string} id
 */

/**
 * @param {Window} target 
 * @param {MessageType} type 
 * @param {*} message 
 * @param {*} [id] 
 */
LVMessenger.broadcast = function (target, type, message, id){
    if(target) target.postMessage(JSON.stringify({type: type, data: message, id: id}), '*');
}

/**
 * @param {(type:MessageType,data:*,id:string?)=>void} callback
 * @param {MessageType} [destroyWhenType]
 */
LVMessenger.receive = function (callback, destroyWhenType) {
    /** @type {(this: Window, ev: MessageEvent<any>) => any} */
    var messageListener = function (ev) {
        try {
            /** @type {LVMessage} */
            var data = typeof ev.data === "string" ? JSON.parse(ev.data) : ev.data;
            
            if (data.type) switch (data.type) {
                default: callback(data.type, data.data, data.id); break;
                case "identify":
                    console.log("Reveived an identity request", ev);
                    /** @type {Identity} */
                    var identity = { name: "LVOS" };
                    if (ev.source instanceof Window)
                        LVMessenger.broadcast(ev.source, LVMessenger.types.identity,  identity);
                    break;
            }
            // else console.warn("Missing data property", data);
            if (data.type === destroyWhenType) this.window.removeEventListener("message", messageListener);
        } catch (ex) {
            console.warn("Error decoding data", ev.data, ex);
        }
    };

    window.addEventListener("message", messageListener);

    return messageListener;
};


/**
 * @param {MessageType} type 
 * @param {LVMessage} [message]
 * @param {*} [id]
 */
LVMessenger.broadcastToParent = function (type, message, id) {
    if (window.top) LVMessenger.broadcast(window.top, type, message, id);
};

/**
 * @param {MessageType} type 
 * @param {LVMessage} message 
 * @param {HTMLIFrameElement} iFrame 
 */
LVMessenger.broadcastToChild = function (type, message, iFrame) {
    if (iFrame.contentWindow) LVMessenger.broadcast(iFrame.contentWindow, type, message);
};

/** @param {()=>void} callback */
LVMessenger.onHostBeingLVOS = function (callback) {
    LVMessenger.receive(function(type, data) {
        if (type === "identity" && data.name == "LVOS") callback();
    }, "identity");
    LVMessenger.broadcastToParent(LVMessenger.types.identify);
}