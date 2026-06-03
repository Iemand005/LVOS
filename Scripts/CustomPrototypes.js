  //    Simple replacements for missing prototypes in Internet Explorer 11 due to it still using ES5. I tried my best to make my own prototypes to fill the missing functions so I can at least use some modern functions.
 //     Lasse Lauwerys © 2023
//      23/12/2023

'use strict';
'use esnext';

if(!HTMLElement.prototype.createAttribute) HTMLElement.prototype.createAttribute = function(attribute) {
    this.setAttribute(attribute, null);
};

// Bug fix, "force === null" --> "typeof force === 'undefined'".
if(!HTMLElement.prototype.toggleAttribute) HTMLElement.prototype.toggleAttribute = function(attribute, force) {
    if (typeof force === 'undefined'? force = !this.hasAttribute(attribute) : force) this.createAttribute(attribute);
    else this.removeAttribute(attribute);
    return !force;
};

// This one was a little bit more difficult to get working right but I tested most values like numbers, null, true, false, undefined and it all gave the same results as the Array.fill method in Chrome does so I expect this polyfill to work the same for my applications.
if(!Array.prototype.fill) Array.prototype.fill = function(value, from, to){
    for (/*let*/var index = typeof from !== 'undefined' ? Number(from) : 0; index < Number(typeof to !== 'undefined' ? to : this.length); index++) this[index] = value;
    return this;
};

if(typeof MutationObserver === "undefined") window.MutationObserver = function(callback) {
    /**
     * @param {Node} target
     * @param {MutationObserverInit} [options]
     */
    this.observe = function(target, options){
        target.addEventListener('DOMNodeInserted', callback, false);
    }
    /** @type {} */
    this.disconnect = function(target, options) {}
    /** @returns {MutationRecord[]} */
    this.takeRecords = function() { return []; }
};

function CompatibilityChecker(){
    this.checkClasses = function(){
        try { eval("class c{}") } catch(e) { return false }
        return true;
    }
}

if (!Object.hasOwn) Object.hasOwn = function(o, v) { return o.hasOwnProperty(v); };

function forEachIn(callback) { // hasOwnProperty has been deprecated and replaced with Object.hasOwn().
    for (var i in this) if (Object.hasOwn(this, i)) callback(this[i], i, this); // TODO: wrap in function because the var will nbe last of ieteration in the end
}

/**
 * @template T
 * @param {(value: T, key: number, array: T[]) => void} callbackfn 
 * @param {any} thisArg
 */
function forEachIndexed(callbackfn, thisArg) {
    for (var i = 0; i < this.length; ++i) if (this.hasOwnProperty(i)) callbackfn.bind(thisArg, this[i], i, this);
}


// Deze is niet volledig, ik moet nog de thisArguments toevoegen, wat ook afhangt van de stricte modus. Ik gebruik hier wel hasOwnProperty om te verifiëren dat we geen sleutels binnen krijgen die niet in ons object bestaan (gebeurt normaal niet).
if(!Array.prototype.forEach) Array.prototype.forEach = forEachIndexed;
if (!NodeList.prototype.forEach) NodeList.prototype.forEach = forEachIndexed;

if (!Object.defineProperty) Object.defineProperty = function(o, key, attributes) {
    if (!attributes || !(o instanceof Object)) return;
    if (attributes.get) o.__defineGetter__(key, attributes.get);
    if (attributes.set) o.__defineSetter__(key, attributes.set);
}

if (!document.querySelectorAll) document.querySelectorAll = function(selector) {
    return document.getElementsByTagName(selector);
}

if (!document.querySelector) document.querySelector = function(selector) {
    return document.querySelectorAll(selector)[0];
}

// if (!document.body.getBoundingClientRect) document.body.getBoundingClientRect = function() {}

// Function.prototype.bind =
if (!Function.prototype.bind) Function.prototype.bind = function(thisArg) {
    var fn = this;
    var slice = Array.prototype.slice;
    var args = slice.call(arguments, 1);

    return function() {
      var finalArgs = args.concat(slice.call(arguments));
      return fn.apply(thisArg, finalArgs);
    };  
  };

// if (!Console.prototype.log)
if (typeof console == "undefined") {
    console = {
        log: function(message) {
            // alert(message);
        },
        warn: function(message) {
            alert("Warning: " + message);
        },
        error: function(message) {
            alert("Error: " + message);
        }
    }
}

if (!("classList" in document.documentElement)) HTMLElement.prototype.__defineGetter__("classList", function() {
    /** @type {HTMLElement} */
    var self = this;
    return {
        get classes() { return self.className.split(" ").filter(function(value) { return value.length; }); },
        add: function(className) {
            if (!this.contains(className))
                self.className += (self.className ? " " : "") + className;
        },
        remove: function(className) {
            var reg = new RegExp('(\\s|^)' + className + '(\\s|$)');
            self.className = self.className.replace(reg, ' ').replace(/^\s+|\s+$/g, "");
        },
        contains: function(className) {
            return new RegExp('(\\s|^)' + className + '(\\s|$)').test(self.className);
        },
        toggle: function(className) {
            if (this.contains(className)) this.remove(className);
            else this.add(className);
        },
        get length() {
            return this.classes.length;
        }
    };
});

//Object.prototype.forEach = forEach; //Geeft problemen met normale lussen die geen hasOwnProperty bevatten.
Object.defineProperty(Object.prototype, 'forEach', { value:  forEachIndexed}); // Not enumerable, so we don't mess up forin loops that don't check hasOwnProperty();

//HTMLCollection.prototype.forEach = forForEach;

if (!Array.prototype.find) NodeList.prototype.find = Array.prototype.find = find;

function find(callback) {
    for (var index in this) if (this.hasOwnProperty(index) && callback(this[index], index, this)) return this[index];
}

if(!Document.prototype.elementsFromPoint) Document.prototype.elementsFromPoint = Document.prototype.msElementsFromPoint;


if (!navigator.getUserMedia) navigator.getUserMedia = navigator.webkitGetUserMedia;

// I tested this one with "String.prototype.repeat.bind("hey", 2)()", this gives me the same result with polyfill as the native code!
if (!String.prototype.repeat) String.prototype.repeat = function (e) {
    if (typeof this === 'undefined') throw new TypeError("String.prototype.repeat called on null or undefined"); // To correspond to String.prototype.repeat.bind(null, undefined)() in Google Chrome
    /*let*/var result = "";
    for (/*let*/var i = 0; i < e; i++) result += this;
    return result;
}

if (typeof URLSearchParams === "undefined") {
    window.URLSearchParams = function (search) {
        /*const*/var items = search.replace("?", "").split("&");
        // /*const*/var kv = items[0].split("=");
        // /*const*/var key = kv[0], value = kv[1];
        this._data = new Map();
        /*const*/var self = this;
        items.forEach(function (item) {
            /*const*/var kv = item.split("=");
            if (kv.length != 2) return;
            /*const*/var key = kv[0];
            /*const*/var value = kv[1];

            self._data.set(key, value);
        });
    };

    URLSearchParams.prototype.get = function (key) {
        return this._data.get(key);
    };

    Object.defineProperty(URLSearchParams.prototype, 'size', { get: function () { return this._data.size; }});
// URLSearchParams.prototype.__defineGetter__('size', function() {
//     return this._data.size;
// });
}
// function searchParams(params) {
//     try {
//         return new URL(window.location).searchParams;
//     } finally {
//         window.location.href.split("?")[0];
//         return {
//             search: params,
//             // searchParams: ,
//             get: function (key) {

//             }
//         }
//     }
// }

// // Kan ook in één lijn met arrowfunctie maar dit heeft geen nut aangezien arrowfuncties in Internet Explorer zowieso niet ondersteund worden. Aangepast this object kan ook niet met arrow functie door gebrek aan bindingsfunctionaliteit.
// if(!Array.prototype.forEach) Array.prototype.forEach = callback => { for(/*let*/var index in this) if(this.hasOwnProperty(index)) callback(this[index], index) }

if (!document.elementsFromPoint) document.elementsFromPoint = function (point) {
    // if (typeof point === "undefined")
    //     point = document.createElement("div");
    // point.style.position = "absolute";
    console.log("Point", point);
}

if (typeof Array.from !== "function") {
    var arrayFromPolyfill = function (arrayLike) {
        var newArray = [];
        if (!arrayLike || typeof arrayLike.length !== "number") return newArray;
        for (var i = 0; i < arrayLike.length; i++) newArray.push(arrayLike[i]);
        return newArray;
    };

    try {
        Object.defineProperty(Array, "from", {
            value: arrayFromPolyfill,
            configurable: true,
            writable: true
        });
    } catch (ex) {
        Array.from = arrayFromPolyfill;
    }
}

(function() {
    var lastTime = 0;

    if (!window.requestAnimationFrame) window.requestAnimationFrame = function(callback, element) {
        var currTime = new Date().getTime();
        var fps = 60;
        var timeToCall = Math.max(0, 1000/fps - (currTime - lastTime));
        var id = window.setTimeout(function() { callback(currTime + timeToCall); }, timeToCall);
        lastTime = currTime + timeToCall;
        return id;
    };
}());

(function () {
  // Controleer of er al een native Promise aanwezig is (zoals in Edge of Chrome)
  if (typeof window.Promise === 'function') {
    return;
  }

  // Interne statussen gedefinieerd als getallen (ES3-veilig)
  var PENDING = 0;
  var FULFILLED = 1;
  var REJECTED = 2;

  // De Constructor Functie
  function ES3Promise(executor) {
    if (typeof executor !== 'function') {
      throw new TypeError('Promise resolver is geen functie');
    }

    var self = this;
    self._state = PENDING;
    self._value = undefined;
    self._deferreds = []; // Lijst met gekoppelde .then() handlers

    // Interne resolve functie
    function resolve(newValue) {
      try {
        // Controleren op "Thenables" (andere Promises in de keten)
        if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
          var then = newValue.then;
          if (typeof then === 'function') {
            then.call(newValue, resolve, reject);
            return;
          }
        }
        
        if (self._state !== PENDING) return;
        self._state = FULFILLED;
        self._value = newValue;
        self._handleDeferreds();
      } catch (e) {
        reject(e);
      }
    }

    // Interne reject functie
    function reject(reason) {
      if (self._state !== PENDING) return;
      self._state = REJECTED;
      self._value = reason;
      self._handleDeferreds();
    }

    // Voer de executor direct uit
    try {
      executor(resolve, reject);
    } catch (err) {
      reject(err);
    }
  }

  // Interne loop om handlers asynchroon af te vuren
  ES3Promise.prototype._handleDeferreds = function () {
    var self = this;
    if (self._state === PENDING) return;

    // setTimeout is de enige universele macro-task deferrer in ES3 (werkt overal)
    setTimeout(function () {
      while (self._deferreds.length > 0) {
        // .shift() is ondersteund sinds ES3 (IE5.5+)
        var deferred = self._deferreds.shift(); 
        var callback = self._state === FULFILLED ? deferred.onFulfilled : deferred.onRejected;

        if (typeof callback !== 'function') {
          if (self._state === FULFILLED) {
            deferred.resolve(self._value);
          } else {
            deferred.reject(self._value);
          }
          continue;
        }

        try {
          var ret = callback(self._value);
          deferred.resolve(ret);
        } catch (err) {
          deferred.reject(err);
        }
      }
    }, 0);
  };

  // De .then methode (Geactiveerd via string-property om ES3-parsers niet te laten crashen)
  ES3Promise.prototype['then'] = function (onFulfilled, onRejected) {
    var self = this;
    return new ES3Promise(function (resolve, reject) {
      self._deferreds.push({
        onFulfilled: onFulfilled,
        onRejected: onRejected,
        resolve: resolve,
        reject: reject
      });
      self._handleDeferreds();
    });
  };

  // De .catch methode (Als string gedefinieerd wegens strict gereserveerd ES3-keyword)
  ES3Promise.prototype['catch'] = function (onRejected) {
    return this['then'](null, onRejected);
  };

  // Statische helper: Promise.resolve()
  ES3Promise.resolve = function (value) {
    return new ES3Promise(function (resolve) {
      resolve(value);
    });
  };

  // Statische helper: Promise.reject()
  ES3Promise.reject = function (reason) {
    return new ES3Promise(function (resolve, reject) {
      reject(reason);
    });
  };

  // Koppel de polyfill aan het globale window object
  window.Promise = ES3Promise;
})();

