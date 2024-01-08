// Reflector for LWM
// Lasse Lauwerys (c) 2023
// 24/12/2023, cleaned up 8/1/2024 ready for producton support for ES5 and higher (2009+).

function Reflector(element){
    this.element = element;
    this.observer;
    this.clones = new Array();
}

Reflector.prototype.reflect = function(target){
    const reflection = target.cloneNode(true);
    reflection.id += "reflection";
    this.clones.push(reflection);
    this.element.appendChild(reflection);

    observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === "attributes") {
                reflection.style.top = toPixels(target.offsetTop - dock.offsetTop + (dock.offsetHeight*0));
                reflection.style.left = toPixels((target.offsetLeft - dock.offsetLeft) + (dock.offsetWidth /2));
                reflection.style.width = mutation.target.style.width;
                reflection.style.height = mutation.target.style.height;
                reflection.style.zIndex = mutation.target.style.zIndex;
            }
        });
    });
    observer.observe(target, { attributes: true });
    return reflection;
}