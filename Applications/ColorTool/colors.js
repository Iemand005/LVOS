'use strict';

/**
 * Normalizes a hex colour string to a 7 character #rrggbb value.
 * Shorthand (#abc) is expanded to its long form.
 * @param {string} value
 * @returns {string | null} the normalized colour or null when invalid
 */
function normalizeHex(value) {
	var hex = value.trim().replace(/^#?/, "#");
	if (/^#[0-9a-f]{3}$/i.test(hex))
		hex = "#" + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
	return /^#[0-9a-f]{6}$/i.test(hex) ? hex : null;
}

function load() {
	var preview = document.getElementById("preview");
	var input = document.getElementById("hex");
	if (!preview || !input) return;

	function apply() {
		var hex = normalizeHex(input.value);
		if (!hex) return;
		preview.style.backgroundColor = hex;
	}

	input.addEventListener("input", apply, false);
	input.addEventListener("change", apply, false);
	apply();
}

window.addEventListener("load", load, false);
