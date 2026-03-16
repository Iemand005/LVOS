  // iFrame <-> mainFrame Messenger
 // Lasse Lauwerys (c) 2026
// 8/1/2024 -> patch 11/1/2024, added origin identifier without CORS -> patch 01/02/2026, don't parse if not a string, did other stuff ya kno -> patch 08/03/2026, remove duplicate function

'use strict';
'use esnext';
'use moz';

Messenger.types = {
    open: "open",
    windowSize: "windowSize",
    launchOverlay: "launchOverlay",
    prepareToLaunchOverlay: "prepareToLaunchOverlay",
    readyToLaunchOverlay: "readyToLaunchOverlay",
    identify: "identify",
    identity: "identity"
};

/** @typedef {keyof typeof Messenger.types} MessageType */

/**
 * @typedef Identity
 * @prop {string} name
 */

/**
 * @typedef Message
 * @prop {MessageType} type
 * @prop {*} data
 * @prop {string} id
 */

function Messenger(){
}

/**
 * @param {HTMLIFrameElement} target 
 * @param {MessageType} type 
 * @param {*} message 
 * @param {*} id 
 */
Messenger.broadcast = function (target, type, message, id){
    if(target) target.postMessage(JSON.stringify({type: type, data: message, id: id}), '*');
}

/**
 * @param {MessageType} type 
 * @param {*} message 
 * @param {HTMLIFrameElement} iFrame 
 */
Messenger.prototype.broadcastToChild = function (type, message, iFrame) {
    Messenger.broadcast(iFrame.contentWindow, type, message);
};

/**
 * @param {(type:MessageType,data:*,id:string?)=>void} callback
 * @param {MessageType} destroyWhenType
 */
Messenger.receive = function (callback, destroyWhenType) {
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
                    Messenger.broadcast(ev.source, Messenger.types.identity,  identity);
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



Messenger.broadcastToParent = function (type, message, id) {
    Messenger.broadcast(window.top, type, message, id);
};

Messenger.broadcastToChild = Messenger.broadcastChild = function (type, message, iFrame) {
    Messenger.broadcast(iFrame.contentWindow, type, message);
};

/** @param {()=>void} callback */
Messenger.onHostBeingLVOS = function (callback) {
    Messenger.receive(function(type, data) {
        if (type === "identity" && data.name == "LVOS") callback();
    }, "identity");
    Messenger.broadcastToParent(Messenger.types.identify);
}