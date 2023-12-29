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
    this.reflect = function(container){
        const clone = container.cloneNode(true);
        clone.id += "reflection";
        this.clones.push(clone);
        this.element.appendChild(clone);

        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === "attributes") {
                    console.log("attribute changed");
                    clone.style.top = mutation.target.style.top;
                    clone.style.left = mutation.target.style.left;
                    clone.style.width = mutation.target.style.width;
                    clone.style.height = mutation.target.style.height;
                }
            });
        });
          
        observer.observe(this.element, { attributes: true });
        return clone;
    }
}