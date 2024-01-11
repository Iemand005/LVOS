/**
 * @author Lasse Lauwerys
 * @version 1.0.0
 * @copyright Lasse Lauwerys © 2023
 */
'use strict';

const applist = document.getElementById("applist");

applist.addEventListener("submit", function(event){ event.preventDefault(); });

let reflecitons = false;

const windowr = document.getElementById("windows");
const dock = document.getElementById("dock");
const reflectionr = document.getElementById("reflection");
const reflector = new Reflector(document.getElementById("reflection"));
const applistItems = document.getElementById("dockapplist");

function toggleReflections(force){
    if(force == null) reflecitons = !reflecitons;
    else reflecitons = Boolean(force);
    if(reflecitons) {
        for (let windowId in windows) reflector.reflect(windows[windowId].target);
        //for (let index in applistItems) reflector.reflect(applistItems[index]);
        reflector.reflect(applistItems);
    }
    else if(observer!=undefined && observer!=null) observer.disconnect();
}