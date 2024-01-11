// Messenger
// Lasse Lauwerys
// 8/1/2024

function broadcast(target, type, message){
    target.postMessage(JSON.stringify({type: type, data: message}), '*');
}

let onmessage = new Function();

Messenger.receive = function(callback){
    window.onmessage = function(ev) {
        const data = JSON.parse(ev.data);
        callback(data.type, data.data);
    }
}

function Messenger(){
    window.onmessage = function(ev) {
        this.onmessage(JSON.parse(ev.data));
    }
}

Messenger.types = {
    po: "é",
    open: "open",
    windowSize: "windowSize",
    launchOverlay: "launchOverlay",
    prepareToLaunchOverlay: "prepareToLaunchOverlay",
    readyToLaunchOverlay: "readyToLaunchOverlay"
}

Messenger.prototype = {

    types: {
        po: "é",
        open: "open",
        windowSize: "windowSize",
        launchOverlay: "launchOverlay",
        readyToLaunchOverlay: "readyToLaunchOverlay"
    },

    types: Messenger.types,

    onmessage = new Function(),

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