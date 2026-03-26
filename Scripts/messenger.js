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
 * @param {MessageType} type 
 * @param {*} message 
 * @param {HTMLIFrameElement} iFrame 
 */
LVMessenger.prototype.broadcastToChild = function (type, message, iFrame) {
    if (!iFrame.contentWindow) return;
    LVMessenger.broadcast(iFrame.contentWindow, type, message);
};

/**
 * @param {(type:MessageType,data:*,id:string?)=>void} callback
 * @param {MessageType} [destroyWhenType]
 */
LVMessenger.receive = function (callback, destroyWhenType) {
    /** @type {(this: Window, ev: MessageEvent<any>) => any} */
    /*const*/var messageListener = function (ev) {
        try {
            /** @type {Message} */
            /*const*/var data = typeof ev.data === "string" ? JSON.parse(ev.data) : ev.data;
            
            if (data.type) switch (data.type) {
                default: callback(data.type, data.data, data.id); break;
                case "identify":
                    console.log("Reveived an identity request", ev);
                    /** @type {Identity} */
                    /*const*/var identity = { name: "LVOS" };
                    LVMessenger.broadcast(ev.source, LVMessenger.types.identity,  identity);
                    break;
            }
            // else console.warn("Missing data property", data);
            if (data.type === destroyWhenType) this.window.removeEventListener("message", messageListener);
        } catch (ex) {
            console.warn("Error decoding data", ev.data, ex);
        }


        // if (destroy) 
    };

    window.addEventListener("message", messageListener);

    return messageListener;
};



LVMessenger.broadcastToParent = function (type, message, id) {
    LVMessenger.broadcast(window.top, type, message, id);
};

LVMessenger.broadcastToChild = LVMessenger.broadcastChild = function (type, message, iFrame) {
    LVMessenger.broadcast(iFrame.contentWindow, type, message);
};

/** @param {()=>void} callback */
LVMessenger.onHostBeingLVOS = function (callback) {
    LVMessenger.receive(function(type, data) {
        if (type === "identity" && data.name == "LVOS") callback();
    }, "identity");
    LVMessenger.broadcastToParent(LVMessenger.types.identify);
}