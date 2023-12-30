/**
 * @author Lasse Lauwerys
 * @version 1.0.0
 * 
 */
'use strict';
console.log(windows)
const applist = document.getElementById("applist");

applist.addEventListener("submit", function(event){
    event.preventDefault();
    console.log(event.target.name);
});

let reflecitons = true;

const windowr = document.getElementById("windows");
const dock = document.getElementById("dock");
const reflectionr = document.getElementById("reflection");
const reflector = new Reflector(document.getElementById("reflection"));
let observer;

function toggleReflections(force){
    if(force == null) reflecitons = !reflecitons;
    else reflecitons = Boolean(force);
    if(reflecitons) for (let windowId in windows) reflector.reflect(windows[windowId].target);
    else if(observer!=undefined && observer!=null) observer.disconnect();
}