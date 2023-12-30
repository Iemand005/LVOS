// Reflector for LWM
// Lasse Lauwerys (c) 2023
// 24/12/2023
/*
function Reflector(element){
    this.element = element,
    this.clone = this.element.cloneNode(true),
    this.reflect = function(container){
        container.appendChild(this.clone);
    }
}*/

function Reflector(element){
    this.element = element,
    this.clones = new Array(),
    this.reflect = function(target){
        const reflection = target.cloneNode(true);
        reflection.id += "reflection";
        this.clones.push(reflection);
        this.element.appendChild(reflection);

        observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === "attributes") {
                    reflection.style.top = toPixels(target.offsetTop - dock.offsetTop + (dock.offsetHeight*0));//toPixels(target.offsetTop + dock.offsetTop);//toPixels(target.offsetTop - dock.offsetTop + (dock.offsetHeight*0));//toPixels(targetRect.top - dockRect.top);
                    reflection.style.left = toPixels((target.offsetLeft - dock.offsetLeft) + (dock.offsetWidth /2));//toPixels(0 - dock.offsetLeft);//toPixels((target.offsetLeft - dock.offsetLeft) + (dock.offsetWidth /2));
                    reflection.style.width = mutation.target.style.width;
                    reflection.style.height = mutation.target.style.height;
                    reflection.style.zIndex = mutation.target.style.zIndex;
        //reflectionBody.scrollTop = originalBody.scrollTop;
                }
                if(!reflecitons){
                    //reflection
                }
            });
        });
        observer.observe(target, { attributes: true });
        return reflection;
    }
}