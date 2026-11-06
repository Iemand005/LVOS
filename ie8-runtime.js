/*
 * Runtime helpers injected verbatim at the top of the IE8 bundle by
 * ie8-accessors.js. This file is build input, not application source: it is
 * never loaded by the pages directly and is not included in any bundle.
 */
/* ES5 Array/String polyfills for IE8 */
if (!Array.prototype.indexOf) {
	Array.prototype.indexOf = function(searchElement, fromIndex) {
		var len = this == null ? 0 : this.length >>> 0;
		if (len === 0) return -1;
		var n = typeof fromIndex === "number" ? fromIndex | 0 : 0;
		if (n >= len) return -1;
		var k = n >= 0 ? n : Math.max(len - Math.abs(n), 0);
		for (; k < len; k++) {
			if (k in this && this[k] === searchElement) return k;
		}
		return -1;
	};
}
/* IE8 window.innerWidth / window.innerHeight polyfill */
if (typeof window !== "undefined") {
	if (typeof window.innerWidth === "undefined") {
		try {
			Object.defineProperty(window, "innerWidth", {
				get: function() {
					return document.documentElement && document.documentElement.clientWidth 
						? document.documentElement.clientWidth 
						: document.body.clientWidth;
				},
				configurable: true
			});
		} catch(e) {
			// Fallback if Object.defineProperty fails on window in IE8
			window.innerWidth = document.documentElement.clientWidth || document.body.clientWidth;
		}
	}
	if (typeof window.innerHeight === "undefined") {
		try {
			Object.defineProperty(window, "innerHeight", {
				get: function() {
					return document.documentElement && document.documentElement.clientHeight 
						? document.documentElement.clientHeight 
						: document.body.clientHeight;
				},
				configurable: true
			});
		} catch(e) {
			// Fallback if Object.defineProperty fails on window in IE8
			window.innerHeight = document.documentElement.clientHeight || document.body.clientHeight;
		}
	}
}
if (!Array.prototype.lastIndexOf) {
	Array.prototype.lastIndexOf = function(searchElement, fromIndex) {
		var len = this == null ? 0 : this.length >>> 0;
		if (len === 0) return -1;
		var n = typeof fromIndex === "number" ? fromIndex | 0 : len - 1;
		var k = n >= 0 ? Math.min(n, len - 1) : len - Math.abs(n);
		for (; k >= 0; k--) {
			if (k in this && this[k] === searchElement) return k;
		}
		return -1;
	};
}
if (!String.prototype.trim) {
	String.prototype.trim = function() {
		return this.replace(/^\s+|\s+$/g, "");
	};
}
/* IE8 classList polyfill – installed only when the native implementation is absent. */
(function() {
	if (typeof document === "undefined" || !document.createElement) return;
	var testEl = document.createElement("div");
	if (testEl.classList) return; // already supported
	/* Trim leading/trailing whitespace in a class string. */
	function trim(s) { return s.replace(/^\s+|\s+$/g, ""); }
	/* Split a class string into a non-empty token array. */
	function tokens(el) {
		var raw = el.className || "";
		var parts = raw.split(/\s+/);
		var result = [];
		for (var i = 0; i < parts.length; i++) if (parts[i]) result.push(parts[i]);
		return result;
	}
	function join(list) { return list.join(" "); }
	function DOMTokenList(el) { this._el = el; }
	DOMTokenList.prototype = {
		add: function() {
			var list = tokens(this._el);
			for (var i = 0; i < arguments.length; i++) {
				var token = String(arguments[i]);
				if (list.indexOf(token) === -1) list.push(token);
			}
			this._el.className = join(list);
		},
		remove: function() {
			var list = tokens(this._el);
			for (var i = 0; i < arguments.length; i++) {
				var token = String(arguments[i]);
				var idx = list.indexOf(token);
				if (idx !== -1) list.splice(idx, 1);
			}
			this._el.className = join(list);
		},
		toggle: function(token, force) {
			var has = this.contains(token);
			if (has && force !== true) this.remove(token);
			else if (!has && force !== false) this.add(token);
			return !has;
		},
		contains: function(token) {
			return tokens(this._el).indexOf(String(token)) !== -1;
		},
		toString: function() { return this._el.className || ""; },
		bind: function(method) {
			var self = this, args = Array.prototype.slice.call(arguments, 1);
			return function() { self[method].apply(self, args.concat(Array.prototype.slice.call(arguments))); };
		}
	};
	/* Install a classList getter on HTMLElement.prototype if defineProperty works on DOM nodes. */
	try {
		Object.defineProperty(HTMLElement.prototype, "classList", {
			get: function() {
				if (!this.__classList) this.__classList = new DOMTokenList(this);
				return this.__classList;
			},
			enumerable: false,
			configurable: true
		});
	} catch(e) {
		/* Fallback: patch individual elements on-the-fly via __lvosGet/classList usage is handled above. */
	}
})();
function __lvosCapitalize(name) {
	var text = String(name);
	return text.charAt(0).toUpperCase() + text.slice(1);
}
function __lvosMethodName(prefix, name) {
	var base = prefix + __lvosCapitalize(name).replace(/[^A-Za-z0-9_$]/g, "_");
	var method = base;
	var index = 1;
	while (__lvosReserved[method] || __lvosMethodNames[method]) method = base + "$" + (index++);
	__lvosMethodNames[method] = true;
	return method;
}
function __lvosRegister(target, name, getter, setter, enumerable) {
	if (!target) return;
	name = String(name);
	var info = __lvosAccessors[name];
	if (!info) info = __lvosAccessors[name] = { get: null, set: null };
	if (typeof getter === "function") {
		if (!info.get) info.get = __lvosMethodName("get", name);
		target[info.get] = getter;
	}
	if (typeof setter === "function") {
		if (!info.set) info.set = __lvosMethodName("set", name);
		target[info.set] = setter;
	}
	if (enumerable && !(name in target)) target[name] = undefined;
}
function __lvosDefineProperty(target, key, attributes) {
	if (!target || !attributes) return target;
	var hasGetter = typeof attributes.get === "function";
	var hasSetter = typeof attributes.set === "function";
	if (hasGetter || hasSetter) __lvosRegister(target, key, attributes.get, attributes.set, attributes.enumerable === true);
	if ("value" in attributes) target[key] = attributes.value;
	return target;
}
function __lvosDefineProperties(target, descriptors) {
	if (!target || !descriptors) return target;
	for (var key in descriptors) {
		if (Object.prototype.hasOwnProperty.call(descriptors, key))
			__lvosDefineProperty(target, key, descriptors[key]);
	}
	return target;
}
function __lvosObject(target, accessors) {
	for (var i = 0; i < accessors.length; i++) {
		var accessor = accessors[i];
		__lvosRegister(target, accessor.name, accessor.get, accessor.set, true);
	}
	return target;
}
function __lvosGet(object, key) {
	try {
		if (object == null) return;
		var info = __lvosAccessors[key];
		if (info && info.get) {
			var getter = object[info.get];
			if (typeof getter === "function") return getter.call(object);
		}
		return object[key];
	} catch(ex) { console.warn ("Failed to get key in object:", object, key, ex); }
	return;
}
function __lvosSet(object, key, value) {
	if (object == null) return value;
	var info = __lvosAccessors[key];
	if (info) {
		if (info.set) {
			var setter = object[info.set];
			if (typeof setter === "function") {
				setter.call(object, value);
				return value;
			}
		} else if (info.get) {
			var getter = object[info.get];
			if (typeof getter === "function") return value;
		}
	}
	object[key] = value;
	return value;
}
function __lvosIsAccessorMethod(key) {
	return __lvosMethodNames[key] === true;
}
