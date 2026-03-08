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

Messenger.prototype.receive = function (callback) {
    window.addEventListener("message", function (ev) {
        try {
            /** @type {Message} */
            const data = typeof ev.data === "string" ? JSON.parse(ev.data) : ev.data;
            
            if ((data.type && data.data && data.id)) switch (data.type) {
                default: callback(data.type, data.data, data.id);
                case "identify":
                    console.log("Reveived an identity request", ev);
                    /** @type {Identity} */
                    const identity = { name: "LVOS" };
                    Messenger.broadcastChild(Messenger.types.identity,  identity, ev.target);
                    break;
            }
            // else console.warn("Missing data property", data);
        } catch (ex) {
            console.warn("Error decoding data", ev.data, ex);
        }
    });
};



Messenger.broadcastToParent = function (type, message, id) {
    Messenger.broadcast(window.top, type, message, id);
};

Messenger.broadcastToChild = Messenger.broadcastChild = function (type, message, iFrame) {
    Messenger.broadcast(iFrame.contentWindow, type, message);
};