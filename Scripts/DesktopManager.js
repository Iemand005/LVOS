/**
 * @author Lasse Lauwerys
 * @version 1.0.1
 * @copyright Lasse Lauwerys © 2026
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
    if(reflecitons) windowManager.forEachWindow(function(dialog) { reflector.reflect(dialog.target); });
    else if (typeof reflector.observer !== 'undefined') reflector.observer.disconnect();
}