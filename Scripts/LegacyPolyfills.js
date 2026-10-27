//    Simple replacements for missing prototypes in Internet Explorer 11 due to it still using ES5. I tried my best to make my own prototypes to fill the missing functions so I can at least use some modern functions.
//    Loaded through `nomodule` (or directly from a legacy page), so modern browsers never download or execute any of it.
//    Lasse Lauwerys © 2023
//    23/12/2023

'use strict';

if (typeof HTMLElement != 'undefined') {
    if(!HTMLElement.prototype.createAttribute) HTMLElement.prototype.createAttribute = function(attribute) {
        this.setAttribute(attribute, null);
    };

    // Bug fix, "force == null" --> "typeof force == 'undefined'".
    if(!HTMLElement.prototype.toggleAttribute) HTMLElement.prototype.toggleAttribute = function(attribute, force) {
        if (typeof force == 'undefined'? force = !this.hasAttribute(attribute) : force) this.createAttribute(attribute);
        else this.removeAttribute(attribute);
        return !force;
    };
}

// This one was a little bit more difficult to get working right but I tested most values like numbers, null, true, false, undefined and it all gave the same results as the Array.fill method in Chrome does so I expect this polyfill to work the same for my applications.
if(!Array.prototype.fill) Array.prototype.fill = function(value, from, to){
    for (/*let*/var index = typeof from != 'undefined' ? Number(from) : 0; index < Number(typeof to != 'undefined' ? to : this.length); index++) this[index] = value;
    return this;
};

if(typeof MutationObserver == "undefined") window.MutationObserver = function(callback) {
    /**
     * @param {Node} target
     * @param {MutationObserverInit} [options]
     */
    this.observe = function(target, options){
        target.addEventListener('DOMNodeInserted', callback, false);
    }
    this.disconnect = function(target, options) {};
    /** @returns {MutationRecord[]} */
    this.takeRecords = function() { return []; };
};

if (!Object.hasOwn) Object.hasOwn = function(o, v) { return o.hasOwnProperty(v); };

if (typeof Object.assign != "function") Object.assign = function (target) {
    if (target == null) throw new TypeError("Cannot convert undefined or null to object");
    var to = Object(target);
    for (var i = 1; i < arguments.length; i++) {
        var source = arguments[i];
        if (source == null) continue;
        for (var key in source) if (Object.prototype.hasOwnProperty.call(source, key)) to[key] = source[key];
    }
    return to;
};

/**
 * @template T
 * @param {(value: T, key: number, array: T[]) => void} callbackfn 
 * @param {any} thisArg
 */
var forEachIndexed = function(callbackfn, thisArg) {
    for (var i = 0; i < this.length; ++i) callbackfn.call(thisArg, this[i], i, this);
};


// Deze is niet volledig, ik moet nog de thisArguments toevoegen, wat ook afhangt van de stricte modus. Ik gebruik hier wel hasOwnProperty om te verifiëren dat we geen sleutels binnen krijgen die niet in ons object bestaan (gebeurt normaal niet).
if(!Array.prototype.forEach) Array.prototype.forEach = forEachIndexed;
// IE9 does not expose a global NodeList constructor, so only patch it when it exists.
var nodeListPrototype = typeof NodeList != "undefined" ? NodeList.prototype : null;
if (nodeListPrototype && !nodeListPrototype.forEach) nodeListPrototype.forEach = forEachIndexed;

if (!Object.defineProperty) {
    Object.defineProperty = function(o, key, attributes) {
        if (!attributes || !(o instanceof Object)) return;
        if (attributes.get) o.__defineGetter__(key, attributes.get);
        if (attributes.set) o.__defineSetter__(key, attributes.set);
    };
} else {
    try {
        Object.defineProperty({}, "__test__", { value: true });
    } catch (ex) {
        Object.defineProperty = function(o, key, attributes) {
            if (!attributes || !(o instanceof Object)) return;
            if ('value' in attributes) o[key] = attributes.value;
            // Getters/setters are not supported on plain objects in this environment.
        };
    }
}

if (!document.querySelectorAll) document.querySelectorAll = function(selector) {
    return document.getElementsByTagName(selector);
}

if (!document.querySelector) document.querySelector = function(selector) {
    return document.querySelectorAll(selector)[0];
}

var getElementsByClassName = function() {
    return function(className) {
        var results = [];
        var all = this.getElementsByTagName('*');
        var pattern = new RegExp('(^|\\s)' + className + '(\\s|$)');
        for (var i = 0; i < all.length; i++) {
            if (pattern.test(all[i].className)) results.push(all[i]);
        }
        return results;
    };
};

  if (typeof document != 'undefined' && !document.getElementsByClassName) {
    document.getElementsByClassName = getElementsByClassName();
}

if (typeof Document != 'undefined' && Document.prototype && !Document.prototype.getElementsByClassName) {
    Document.prototype.getElementsByClassName = getElementsByClassName();
}

if (typeof Element != 'undefined' && !Element.prototype.getElementsByClassName) {
    Element.prototype.getElementsByClassName = function(className) {
        var results = [];
        var all = this.getElementsByTagName('*');
        var pattern = new RegExp('(^|\\s)' + className + '(\\s|$)');
        for (var i = 0; i < all.length; i++) {
            if (pattern.test(all[i].className)) results.push(all[i]);
        }
        return results;
    };
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
    // Assign through `window`: a bare `console = ...` is a ReferenceError in strict mode.
    window.console = {
        log: function(message) {
            // alert(message);
        },
        warn: function(message) {
            // alert("Warning: " + message);
        },
        error: function(message) {
            alert("Error: " + message);
        }
    }
}

if (typeof HTMLElement != 'undefined' && !("classList" in document.documentElement)) {
    Object.defineProperty(HTMLElement.prototype, "classList", {
        get: function() {
            var self = this;
            
            function getClassesArray() {
                return self.className.split(" ").filter(function(value) { 
                    return value.length > 0; 
                });
            }

            var api = {
                add: function(className) {
                    if (!api.contains(className)) {
                        self.className += (self.className ? " " : "") + className;
                    }
                },
                remove: function(className) {
                    var reg = new RegExp('(\\s|^)' + className + '(\\s|$)');
                    self.className = self.className.replace(reg, ' ').replace(/^\s+|\s+$/g, "");
                },
                contains: function(className) {
                    return new RegExp('(\\s|^)' + className + '(\\s|$)').test(self.className);
                },
                toggle: function(className) {
                    if (api.contains(className)) {
                        api.remove(className);
                    } else {
                        api.add(className);
                    }
                }
            };

            Object.defineProperty(api, "length", {
                get: function() {
                    return getClassesArray().length;
                },
                configurable: true,
                enumerable: true
            });

            return api;
        },
        configurable: true,
        enumerable: true
    });
}

//Object.prototype.forEach = forEach; //Geeft problemen met normale lussen die geen hasOwnProperty bevatten.
try {
    Object.defineProperty(Object.prototype, 'forEach', { value:  forEachIndexed}); // Not enumerable, so we don't mess up forin loops that don't check hasOwnProperty();
} catch (ex) {
    // IE9 refuses defineProperty on Object.prototype; fall back to a plain assignment.
    Object.prototype.forEach = forEachIndexed;
}

//HTMLCollection.prototype.forEach = forForEach;

if (!Array.prototype.find) {
    Array.prototype.find = find;
    if (nodeListPrototype) nodeListPrototype.find = find;
}

var find = function(callback) {
    for (var index in this) if (this.hasOwnProperty(index) && callback(this[index], index, this)) return this[index];
};

if (typeof Document != 'undefined' && Document.prototype && !Document.prototype.elementsFromPoint) {
    Document.prototype.elementsFromPoint = Document.prototype.msElementsFromPoint || function(x, y) {
        return this.msElementsFromPoint ? this.msElementsFromPoint(x, y) : [];
    };
}

if (!navigator.getUserMedia) navigator.getUserMedia = navigator.webkitGetUserMedia;

// I tested this one with "String.prototype.repeat.bind("hey", 2)()", this gives me the same result with polyfill as the native code!
if (!String.prototype.repeat) String.prototype.repeat = function (e) {
    if (typeof this == 'undefined') throw new TypeError("String.prototype.repeat called on null or undefined"); // To correspond to String.prototype.repeat.bind(null, undefined)() in Google Chrome
    /*let*/var result = "";
    for (/*let*/var i = 0; i < e; i++) result += this;
    return result;
}

if (typeof URLSearchParams == "undefined") {
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
    // if (typeof point == "undefined")
    //     point = document.createElement("div");
    // point.style.position = "absolute";
    console.log("Point", point);
}

if (typeof Array.from != "function") {
    var arrayFromPolyfill = function (arrayLike) {
        var newArray = [];
        if (!arrayLike || typeof arrayLike.length != "number") return newArray;
        for (var i = 0; i < arrayLike.length; i++) newArray.push(arrayLike[i]);
        return newArray;
    };

    Array.from = arrayFromPolyfill;

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
  if (typeof window.Promise === 'function')
    return;

  var PENDING = 0;
  var FULFILLED = 1;
  var REJECTED = 2;

  var ES3Promise = function(executor) {
    if (typeof executor != 'function') {
      throw new TypeError('Promise resolver is geen functie');
    }

    var self = this;
    self._state = PENDING;
    self._value = undefined;
    self._deferreds = [];

    var resolve = function(newValue) {
      try {
        if (newValue && (typeof newValue == 'object' || typeof newValue == 'function')) {
          var then = newValue.then;
          if (typeof then == 'function') {
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
    };

    var reject = function(reason) {
      if (self._state !== PENDING) return;
      self._state = REJECTED;
      self._value = reason;
      self._handleDeferreds();
    };

    try {
      executor(resolve, reject);
    } catch (err) {
      reject(err);
    }
  }

  ES3Promise.prototype._handleDeferreds = function () {
    var self = this;
    if (self._state === PENDING) return;

    setTimeout(function () {
      while (self._deferreds.length > 0) {
        var deferred = self._deferreds.shift(); 
        var callback = self._state === FULFILLED ? deferred.onFulfilled : deferred.onRejected;

        if (typeof callback != 'function') {
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

  ES3Promise.prototype['catch'] = function (onRejected) {
    return this['then'](null, onRejected);
  };

  ES3Promise.resolve = function (value) {
    return new ES3Promise(function (resolve) {
      resolve(value);
    });
  };

  ES3Promise.reject = function (reason) {
    return new ES3Promise(function (resolve, reject) {
      reject(reason);
    });
  };

  window.Promise = ES3Promise;
})();

(function () {

    if (window.addEventListener) return;

    var patch = function(target) {
        if (!target) return;

        if (!target._ieListeners) {
            target._ieListeners = [];
        }

        target.addEventListener = function (type, listener) {
            var self = this;
            var eventType = "on" + type;

            var wrapped = function () {
                var event = window.event;

                if (!event.target) {
                    event.target = event.srcElement;
                }

                if (!event.preventDefault) {
                    event.preventDefault = function () {
                        event.returnValue = false;
                    };
                }

                if (!event.stopPropagation) {
                    event.stopPropagation = function () {
                        event.cancelBubble = true;
                    };
                }

                // SAFE CALL (IE8 FIX)
                if (typeof listener == "function") {
                    listener.apply(self, [event]);
                } else {
                    self._currentListener = listener;
                    self._currentListener(event);
                    self._currentListener = null;
                }
            };

            this._ieListeners.push({
                type: type,
                original: listener,
                wrapped: wrapped
            });

            this.attachEvent(eventType, wrapped);
        };

        target.removeEventListener = function (type, listener) {
            var eventType = "on" + type;

            if (!this._ieListeners) return;

            for (var i = 0; i < this._ieListeners.length; i++) {
                var item = this._ieListeners[i];

                if (item.type === type && item.original === listener) {
                    this.detachEvent(eventType, item.wrapped);
                    this._ieListeners.splice(i, 1);
                    return;
                }
            }
        };
    }

    patch(window);
    patch(document);
    patch(Element.prototype);

})();


(function () {

    if (Element.prototype.getBoundingClientRect) {
        return; // already supported
    }

    var getRect = function(el) {
        var x = 0;
        var y = 0;
        var w = el.offsetWidth || 0;
        var h = el.offsetHeight || 0;

        var node = el;

        while (node) {
            x += node.offsetLeft || 0;
            y += node.offsetTop || 0;
            node = node.offsetParent;
        }

        // include scroll offsets (important in old browsers)
        x -= document.body.scrollLeft || document.documentElement.scrollLeft || 0;
        y -= document.body.scrollTop || document.documentElement.scrollTop || 0;

        return {
            left: x,
            top: y,
            right: x + w,
            bottom: y + h,
            width: w,
            height: h
        };
    };

    Element.prototype.getBoundingClientRect = function () {
        return getRect(this);
    };

})();

// if (typeof module != "undefined" && module.)
if (typeof window.HTMLElement == "undefined") window.HTMLElement = Element;
if (typeof window.HTMLTemplateElement == "undefined") window.HTMLTemplateElement = function() {};

// IE / HTA settings storage. Settings.js falls back to this when localStorage is missing.
var STORAGE_FILE = "app_storage.json";

(function() {
	try {

var ActiveXStorage = function() {
    if (!window.ActiveXObject) throw new Error("ActiveX not supported!");
    this.fso = new window.ActiveXObject("Scripting.FileSystemObject");
};

/** @param {string} key @param {*} value */
ActiveXStorage.prototype.setItem = function (key, value) {
    var data = {};
    if (this.fso.FileExists(STORAGE_FILE)) try {
        var readFile = this.fso.OpenTextFile(STORAGE_FILE, 1);
        data = JSON.parse(readFile.ReadAll());
        readFile.Close();
    } catch (e) { data = {}; }
    data[key] = value;
    var writeFile = this.fso.OpenTextFile(STORAGE_FILE, 2, true);
    writeFile.Write(JSON.stringify(data));
    writeFile.Close();
};

ActiveXStorage.prototype.getItem = function (key) {
    if (!this.fso.FileExists(STORAGE_FILE)) return null;
    try {
        var readFile = this.fso.OpenTextFile(STORAGE_FILE, 1);
        var data = JSON.parse(readFile.ReadAll());
        readFile.Close();
        return data[key] !== undefined ? data[key] : null;
    } catch (e) {
        return null;
    }
};

	} catch(ex) {console.log("ActiveX" , ex)}

})();

(function() {
	if (typeof window.CSS !== "undefined") return;

	var CSS = function() {

	};

	CSS.prototype.supports = function() { return false; };

	// ScrollTabs.js calls the *static* CSS.supports(...), not an instance method.
	CSS.supports = function() { return false; };

	window.CSS = CSS;
})();

(function() {
	if (typeof window.BroadcastChannel !== "undefined") return;

	var instances = [];
	var originId = String(new Date().getTime()) + String(Math.random()).slice(2);
	var counter = 0;
	var KEY_PREFIX = "__lvbc__";

	var clone = function(value) {
		if (value === null || typeof value !== "object") return value;
		try { return JSON.parse(JSON.stringify(value)); } catch (ex) { return null; }
	};

	var deliver = function(channel, data) {
		if (channel.closed || typeof channel.onmessage !== "function") return;
		channel.onmessage({ type: "message", data: clone(data), target: channel });
	};

	/** @param {string} name */
	var BroadcastChannel = function(name) {
		this.name = String(name);
		this.onmessage = null;
		this.closed = false;
		this._key = KEY_PREFIX + this.name;
		this._id = originId + ":" + (++counter);
		instances.push(this);
	}

	BroadcastChannel.prototype.postMessage = function (message) {
		if (this.closed) return;
		var i, other;
		// Same document: hand the message straight to the other channels on this name.
		for (i = 0; i < instances.length; i++) {
			other = instances[i];
			if (other !== this && !other.closed && other.name === this.name) deliver(other, message);
		}
		// Other tabs/windows of the same origin: IE11 has no BroadcastChannel but it
		// does fire `storage` events in every document except the one that wrote.
		try {
			if (window.localStorage) window.localStorage.setItem(this._key, JSON.stringify({ id: this._id, data: message }));
		} catch (ex) {}
	};

	BroadcastChannel.prototype.close = function () {
		this.closed = true;
		var index = instances.indexOf(this);
		if (index > -1) instances.splice(index, 1);
	};

	var onStorageEvent = function(ev) {
		if (!ev || !ev.key || ev.key.indexOf(KEY_PREFIX) !== 0 || ev.newValue == null) return;
		var name = ev.key.slice(KEY_PREFIX.length);
		var payload;
		try { payload = JSON.parse(ev.newValue); } catch (ex) { return; }
		if (!payload || payload.id === originId) return;
		for (var i = 0; i < instances.length; i++)
			if (!instances[i].closed && instances[i].name === name) deliver(instances[i], payload.data);
	}

	if (window.addEventListener) window.addEventListener("storage", onStorageEvent, false);
	else if (window.attachEvent) window.attachEvent("onstorage", onStorageEvent);

	window.BroadcastChannel = BroadcastChannel;

})();

(function() {
	if (typeof window.Map !== "undefined") return;

	var Map = function() {
		this.object = {};
	};

	Map.prototype.get = function(key) { return this.object[key]; };
	Map.prototype.set = function(key, value) { return this.object[key] = value; };

	window.Map = Map;
})();

if (!window.cancelAnimationFrame) window.cancelAnimationFrame = function(){};

if (typeof Event !== "undefined" && Event.prototype) {
	if (!Event.prototype.stopImmediatePropagation) {
		Event.prototype.stopImmediatePropagation = function() {
			this.isImmediatePropagationStopped = function() { return true; };
			this.cancelBubble = true;
			if (this.stopPropagation) this.stopPropagation();
		};
	}
}