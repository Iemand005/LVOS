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

const reflecitons = true;

const windowr = document.getElementById("windows");
const dock = document.getElementById("dock");
const reflectionr = document.getElementById("reflection");


if(reflecitons){
    const reflector = new Reflector(document.getElementById("reflection"));
    for (let windowId in windows) {
        const target = windows[windowId].target;
        const reflection = reflector.reflect(target);
        //const reflectionDialog = new Dialog(reflection);
        const originalBody = getDialogBody(target);
        const reflectionBody = getDialogBody(reflection);
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === "attributes") {
                    reflection.style.top = toPixels(target.offsetTop - dock.offsetTop + (dock.offsetHeight*0));//toPixels(target.offsetTop + dock.offsetTop);//toPixels(target.offsetTop - dock.offsetTop + (dock.offsetHeight*0));//toPixels(targetRect.top - dockRect.top);
                    reflection.style.left = toPixels((target.offsetLeft - dock.offsetLeft) + (dock.offsetWidth /2));//toPixels(0 - dock.offsetLeft);//toPixels((target.offsetLeft - dock.offsetLeft) + (dock.offsetWidth /2));
                    reflection.style.width = mutation.target.style.width;
                    reflection.style.height = mutation.target.style.height;
                    reflection.style.zIndex = mutation.target.style.zIndex;
                    reflectionBody.scrollTop = originalBody.scrollTop;
                }
            });
        });
          
        observer.observe(target, { attributes: true });
    }
}