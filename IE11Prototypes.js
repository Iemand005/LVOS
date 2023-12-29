  //    Simple replacements for missing prototypes in Internet Explorer 11 due to it still using ES5. I tried my best to make my own prototypes to fill the missing functions so I can at least use some modern functions.
 //     Lasse Lauwerys © 2023
//      23/12/2023

if(!HTMLElement.prototype.toggleAttribute) HTMLElement.prototype.toggleAttribute = function(attribute, force){
    if(force == null) /*const enabled = force ||*/force = this.hasAttribute(attribute);
    if (force) this.removeAttribute(attribute);
    else this.setAttribute(attribute, "true");
    return !force;
};

if(!MutationObserver) MutationObserver = function(callback){
    this.observe = function(element){
        element.addEventListener('DOMNodeInserted', callback, false);
    }
}

try{eval("class e{}")}catch(e){console.log("notsupported!", e)}

if(!Array.prototype.forEach){ // versie 1
    Array.prototype.forEach = function(callback){
        for (let index in this) {
            if (this.hasOwnProperty(index)) {
                //const element = object[key];
                callback(this[index], index);
            }
        }
    }
}

// Deze is niet volledig, ik moet nog de thisArguments toevoegen, wat ook afhangt van de stricte modus. Ik gebruik hier wel hasOwnProperty om te verifiëren dat we geen sleutels binnen krijgen die niet in ons object bestaan (gebeurt normaal niet).
if(!Array.prototype.forEach) Array.prototype.forEach = function(callback) {
    // hasOwnProperty has been deprecated and replaced with Object.hasOwn().
    for (let index in this) if (this.hasOwnProperty(index)) callback(this[index], index, this);
}
if (!NodeList.prototype.forEach) NodeList.prototype.forEach = Array.prototype.forEach;

if (!Array.prototype.find) NodeList.prototype.find = Array.prototype.find = function(callback) {
    for (let index in this) if (this.hasOwnProperty(index)) if(callback(this[index], index, this)) return this[index];
}

if(!Document.prototype.elementsFromPoint) Document.prototype.elementsFromPoint = Document.prototype.msElementsFromPoint;

// Kan ook in één lijn met arrowfunctie maar dit heeft geen nut aangezien arrowfuncties in Internet Explorer zowieso niet ondersteund worden. Aangepast this object kan ook niet met arrow functie door gebrek aan bindingsfunctionaliteit.
// if(!Array.prototype.forEach) Array.prototype.forEach = callback => { for(let index in this) if(this.hasOwnProperty(index)) callback(this[index], index) }

//if(!class)