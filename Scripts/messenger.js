// Messenger
// Lasse Lauwerys
// 8/1/2024 -> patch 11/1/2024, added origin identifier without CORS -> patch 01/02/2026, don't parse if not a string

'use strict';
'use esnext';
'use moz';

function broadcast(target, type, message, id){
    if(target) target.postMessage(JSON.stringify({type:type, data:message, id:id}), '*');
}

Messenger.receive = function (callback) {
    window.addEventListener("message", function (ev) {
        const data = typeof ev.data === "string" ? JSON.parse(ev.data) : data
        // does data have all the things
        if (data.type && data.data && data.id)
            callback(data.type, data.data, data.id);
    });
};

function Messenger(){
}

Messenger.types = {
    open: "open",
    windowSize: "windowSize",
    launchOverlay: "launchOverlay",
    prepareToLaunchOverlay: "prepareToLaunchOverlay",
    readyToLaunchOverlay: "readyToLaunchOverlay"
};

Messenger.prototype = {
    broadcastToChild: function (type, message, iFrame) {
        broadcast(iFrame.contentWindow, type, message);
    }
};

Messenger.broadcastFromChild = function (type, message, id) {
    broadcast(window.top, type, message, id);
};

Messenger.broadcastToParent = Messenger.broadcastFromChild;

Messenger.broadcastToChild = Messenger.broadcastChild = function (type, message, iFrame) {
    broadcast(iFrame.contentWindow, type, message);
};