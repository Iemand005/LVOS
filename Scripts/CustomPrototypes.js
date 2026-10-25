// Shared prototype additions used by the modern bundle (Chrome / ES2021+ targets).
// The legacy ES5 / IE11 polyfills live in LegacyPolyfills.js and are only ever
// loaded through a `nomodule` script tag, so they never cost a modern browser anything.
//     Lasse Lauwerys © 2023

'use strict';

/**
 * Array-like iteration shared by every object. The length is read once so a callback
 * that mutates the collection cannot extend the loop, and a missing `length` is
 * treated as an empty collection instead of `undefined`.
 * @template T
 * @this {{length?: number, [key: number]: T}}
 * @param {(this: any, value: T, key: number, array: any) => void} callbackfn
 * @param {any} [thisArg]
 * @returns {void}
 */
function forEachIndexed(callbackfn, thisArg) {
	if (typeof callbackfn !== "function") throw new TypeError(callbackfn + " is not a function");
	var length = this == null || typeof this.length !== "number" ? 0 : this.length >>> 0;
	for (var i = 0; i < length; ++i) callbackfn.call(thisArg, this[i], i, this);
}

// Non-enumerable and configurable: it must not show up in for-in loops, but another
// implementation is still allowed to replace it.
if (!Object.prototype.hasOwnProperty("forEach")) Object.defineProperty(Object.prototype, "forEach", {
	value: forEachIndexed,
	writable: true,
	configurable: true
});
