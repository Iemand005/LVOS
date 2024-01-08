// Messenger
// Lasse Lauwerys
// 8/1/2024

function broadcast(target, type, message){
    target.postMessage(JSON.stringify({type: type, data: message}), '*');
}

function Messenger(){}

Messenger.prototype = {

    types: {
        windowSize: "windowSize"
    },

    // event: new CustomEvent("message"),

    // broadcastFromChild: broadcast.bind(window.top),
    // broadcastToChild: broadcast.bind()

    broadcastFromChild: function(type, message){
        broadcast(window.top, type, message);
    },

    broadcastToChild: function(type, message, iFrame){
        broadcast(iFrame.contentWindow, type, message);
    }
}