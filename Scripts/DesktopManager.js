/**
 * @author Lasse Lauwerys
 * @version 1.0.0
 * @copyright Lasse Lauwerys © 2023
 */
'use strict';
'use esnext';

/*const*/var applist = document.getElementById("applist");

applist.addEventListener("submit", function(event){ event.preventDefault(); });

/*let*/var reflecitons = false;

/*const*/var windowr = document.getElementById("windows");
/*const*/var dock = document.getElementById("dock");
/*const*/var reflectionr = document.getElementById("reflection");
/*const*/var reflector = new Reflector(document.getElementById("reflection"));
/*const*/var applistItems = document.getElementById("dockapplist");

function toggleReflections(force){
    if(force === null) reflecitons = !reflecitons;
    else reflecitons = Boolean(force);
    if(reflecitons) {
        for (/*let*/var windowId in windows) reflector.reflect(windows[windowId].target);
        //for (/*let*/var index in applistItems) reflector.reflect(applistItems[index]);
        reflector.reflect(applistItems);
    }
    else if (typeof reflector.observer !== 'undefined') reflector.observer.disconnect();
}