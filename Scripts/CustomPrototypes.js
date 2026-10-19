// Shared prototype additions used by the modern bundle (Chrome / ES2021+ targets).
// The legacy ES5 / IE11 polyfills live in LegacyPolyfills.js and are only ever
// loaded through a `nomodule` script tag, so they never cost a modern browser anything.
//     Lasse Lauwerys © 2023

'use strict';

/**
 * @template T
 * @param {(value: T, key: number, array: T[]) => void} callbackfn 
 * @param {any} thisArg
 */
function forEachIndexed(callbackfn, thisArg) {
    for (var i = 0; i < this.length; ++i) callbackfn.call(thisArg, this[i], i, this);
}

// Non-enumerable, so we do not mess up for-in loops that do not check hasOwnProperty().
Object.defineProperty(Object.prototype, 'forEach', { value: forEachIndexed });
