// Messenger
// Lasse Lauwerys
// 8/1/2024

function Messenger(){}

/*Messenger.types = {
    windowSize: "windowSize"
};*/


Messenger.prototype = {

    types: {
        windowSize: "windowSize"
    },

    event: new CustomEvent("message"),
    

    onmessage: function(){
        window.onmessage = function(data){
            JSON.parse(data.data);
        }
    },
    broadcastFromChild: function(type, message){
        this.broadcast(window.top, type, message);

//        window.top.postMessage(JSON.stringify(message), '*');
    },
    
    // onMessageFromParent: function(callback){
    //      = callback;
    // },
    broadcast: function(target, type, message){
        //console.log("broadcasting...", target, type, message);
        target.postMessage(JSON.stringify({type: type, data: message}), '*');
    },
    
    broadcastToChild: function(type, message, iFrame){
        this.broadcast(iFrame.contentWindow, type, message);
        //iFrame.contentWindow.postMessage(JSON.stringify({type: type, data: message}), '*');
    }
}

console.log("hey", Messenger)