  //    Simple replacements for missing prototypes in Internet Explorer 11 due to it still using ES5. I tried my best to make my own prototypes to fill the missing functions so I can at least use some modern functions.
 //     Lasse Lauwerys © 2023
//      23/12/2023

'use strict';
'use esnext';

if(!HTMLElement.prototype.createAttribute) HTMLElement.prototype.createAttribute = function(attribute){
    this.setAttribute(attribute, null);
};

// Bug fix, "force === null" --> "typeof force === 'undefined'".
if(!HTMLElement.prototype.toggleAttribute) HTMLElement.prototype.toggleAttribute = function(attribute, force){
    if (typeof force === 'undefined'? force = !this.hasAttribute(attribute) : force) this.createAttribute(attribute);
    else this.removeAttribute(attribute);
    return !force;
};

// This one was a little bit more difficult to get working right but I tested most values like numbers, null, true, false, undefined and it all gave the same results as the Array.fill method in Chrome does so I expect this polyfill to work the same for my applications.
if(!Array.prototype.fill) Array.prototype.fill = function(value, from, to){
    for (let index = typeof from !== 'undefined' ? Number(from) : 0; index < Number(typeof to !== 'undefined' ? to : this.length); index++) this[index] = value;
    return this;
};

if(!MutationObserver) MutationObserver = function(callback){
    this.observe = function(element){
        element.addEventListener('DOMNodeInserted', callback, false);
    }
};

function CompatibilityChecker(){
    this.checkClasses = function(){
        try { eval("class c{}") } catch(e) { return false }
        return true;
    }
}


function forEach(callback) { // hasOwnProperty has been deprecated and replaced with Object.hasOwn().
    for (let index in this) if (this.hasOwnProperty(index)) callback(this[index], index, this);
}

function forForEach(callback) {
    for (let index = 0; index < this.length; index++) if (this.hasOwnProperty(index)) callback(this[index], index, this);
}


// Deze is niet volledig, ik moet nog de thisArguments toevoegen, wat ook afhangt van de stricte modus. Ik gebruik hier wel hasOwnProperty om te verifiëren dat we geen sleutels binnen krijgen die niet in ons object bestaan (gebeurt normaal niet).
if(!Array.prototype.forEach) Array.prototype.forEach = forForEach;
if (!NodeList.prototype.forEach) NodeList.prototype.forEach = forForEach;

//Object.prototype.forEach = forEach; //Geeft problemen met normale lussen die geen hasOwnProperty bevatten.
Object.defineProperty(Object.prototype, 'forEach', { value:  forForEach}); // Not enumerable, so we don't mess up forin loops that don't check hasOwnProperty();

//HTMLCollection.prototype.forEach = forForEach;

if (!Array.prototype.find) NodeList.prototype.find = Array.prototype.find = find;

function find(callback) {
    for (let index in this) if (this.hasOwnProperty(index)) if(callback(this[index], index, this)) return this[index];
}

if(!Document.prototype.elementsFromPoint) Document.prototype.elementsFromPoint = Document.prototype.msElementsFromPoint;


if (!navigator.getUserMedia) navigator.getUserMedia = navigator.webkitGetUserMedia;

// I tested this one with "String.prototype.repeat.bind("hey", 2)()", this gives me the same result with polyfill as the native code!
if (!String.prototype.repeat) String.prototype.repeat = function (e) {
    if (typeof this === 'undefined') throw new TypeError("String.prototype.repeat called on null or undefined"); // To correspond to String.prototype.repeat.bind(null, undefined)() in Google Chrome
    let result = "";
    for (let i = 0; i < e; i++) result += this;
    return result;
}

// // Kan ook in één lijn met arrowfunctie maar dit heeft geen nut aangezien arrowfuncties in Internet Explorer zowieso niet ondersteund worden. Aangepast this object kan ook niet met arrow functie door gebrek aan bindingsfunctionaliteit.
// if(!Array.prototype.forEach) Array.prototype.forEach = callback => { for(let index in this) if(this.hasOwnProperty(index)) callback(this[index], index) }
