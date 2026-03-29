/**
 * @author Lasse Lauwerys
 * @version 1.0.0
 * @copyright Lasse Lauwerys © 2023
 */
'use strict';
'use esnext';

var applist = document.getElementById("applist");

applist.addEventListener("submit", function(event){ event.preventDefault(); });

var reflecitons = false;

var windowr = document.getElementById("windows");
var dock = document.getElementById("dock");
var reflectionr = document.getElementById("reflection");
var reflector = new Reflector(document.getElementById("reflection"));
var applistItems = document.getElementById("dockapplist");

function toggleReflections(force){
    if(force === null) reflecitons = !reflecitons;
    else reflecitons = Boolean(force);
    if(reflecitons) {
        windowManager.forEachWindow(function(dialog) {
            reflector.reflect(dialog.target);
        });
        // for (var windowId in windowManager.windows) reflector.reflect(windowManager.windows[windowId].target);
        // reflector.reflect(applistItems);
    }
    else if (typeof reflector.observer !== 'undefined') reflector.observer.disconnect();
}