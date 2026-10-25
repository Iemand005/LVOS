// Reflector for LWM
// Lasse Lauwerys (c) 2023
// 24/12/2023, cleaned up 8/1/2024 ready for producton support for ES5 and higher (2009+).

'use strict';

/** @param {HTMLElement} element */
function Reflector(element) {
	this.element = element;
	this.observer;
	/** @type {HTMLElement[]} */
	this.clones = [];
}
/**
 * @param {HTMLElement} target
 * @returns {HTMLElement?}
 */
Reflector.prototype.reflect = function (target) {
    try {
        var reflection = target.cloneNode(true);
	if (!isElement(reflection)) return null;
	var refElement = reflection;
        refElement.id += "reflection";
        this.clones.push(refElement);
        this.element.appendChild(refElement);

        this.observer = new MutationObserver(function (mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === "attributes" && mutation.target instanceof HTMLElement) {
			var rect = target.getBoundingClientRect();
			refElement.style.top = Helpers.toPixels(rect.top - dock.offsetTop + (dock.offsetHeight*0));
			refElement.style.left = Helpers.toPixels((rect.left - dock.offsetLeft) + (dock.offsetWidth /2));
			refElement.style.width = Helpers.toPixels(rect.width);
			refElement.style.height = Helpers.toPixels(rect.height);
			refElement.style.zIndex = mutation.target.style.zIndex;
                }
            });
        });
        this.observer.observe(target, { attributes: true });
        return refElement;
    } catch (ex) { console.warn(ex); }
    return null;
}
