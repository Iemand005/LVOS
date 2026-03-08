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
    identify: "identify"
};

/** @typedef {keyof typeof Messenger.types} MessageType */

/**
 * @typedef Message
 * @prop {MessageType} type
 * @prop {*} data
 * @prop {string} id
 */

/**
 * @param {HTMLIFrameElement} target 
 * @param {MessageType} type 
 * @param {*} message 
 * @param {*} id 
 */
function broadcast(target, type, message, id){
    if(target) target.postMessage(JSON.stringify({type: type, data: message, id: id}), '*');
}

function Messenger(){
}

Messenger.receive = function (callback) {
    window.addEventListener("message", function (ev) {
        try {
            /** @type {Message} */
            const data = typeof ev.data === "string" ? JSON.parse(ev.data) : ev.data;
            
            if ((data.type && data.data && data.id)) switch (data.type) {
                default: callback(data.type, data.data, data.id);
                case "identify":
                    console.log("Reveived an identity request", ev);
                    break;
            }
            // else console.warn("Missing data property", data);
        } catch (ex) {
            console.warn("Error decoding data", ev.data, ex);
        }
    });
};

/**
 * @param {MessageType} type 
 * @param {*} message 
 * @param {HTMLIFrameElement} iFrame 
 */
Messenger.prototype.broadcastToChild = function (type, message, iFrame) {
    broadcast(iFrame.contentWindow, type, message);
};

Messenger.prototype.broadcastToParent = function (type, message, id) {
    broadcast(window.top, type, message, id);
};

Messenger.prototype.broadcastToChild = Messenger.broadcastChild = function (type, message, iFrame) {
    broadcast(iFrame.contentWindow, type, message);
};