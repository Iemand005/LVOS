// Messenger
// Lasse Lauwerys
// 8/1/2024

function broadcast(target, type, message){
    target.postMessage(JSON.stringify({type: type, data: message}), '*');
}

function Messenger(){}

Messenger.types = {
    windowSize: "windowSize",
    launchOverlay: "launchOverlay"
},

Messenger.prototype = {

    types: {
        po: "é",
        open: "open",
        windowSize: "windowSize",
        launchOverlay: "launchOverlay"
    },

    // event: new CustomEvent("message"),

    // broadcastFromChild: broadcast.bind(window.top),
    // broadcastToChild: broadcast.bind()

    broadcastFromChild: function(type, message){
        broadcast(window.top, type, message);
    },
    broatcastToParent: this.broadcastFromChild,

    broadcastToChild: function(type, message, iFrame){
        broadcast(iFrame.contentWindow, type, message);
    }
}

Messenger.broadcastFromChild = function(type, message){
    broadcast(window.top, type, message);
}

Messenger.broadcastToParent = Messenger.broadcastFromChild;

Messenger.broadcastToChild = Messenger.broadcastChild = function(type, message, iFrame){
        broadcast(iFrame.contentWindow, type, message);
        // broadcast(window.top, type, message);
}