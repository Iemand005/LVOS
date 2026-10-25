
class WindowElement extends HTMLDivElement {

	constructor() {
		super();
		/** @type {Dialog | null} */
		this.dialog = null;
	}

	/** @param {boolean} [enable] Enable maximization */
	toggleMaximizedVT(enable) {
		this.style.viewTransitionName = "window-fullscreen";
		document.activeViewTransition?.skipTransition();

		const toggle = () => this.classList.toggle("maximized", enable);
		if (!("startViewTransition" in document)) return toggle();

		var transition = document.startViewTransition(toggle);
		transition.ready.catch(ev => console.warn("transition interrupted:", ev));

		const dialog = this.dialog;
		if (dialog) transition.finished.finally(() => {
			if (dialog.maximizeAnimations <= 1)
				this.style.viewTransitionName = "";
			dialog.maximizeAnimations--;
		});
	}
}

class OdometerDigit extends HTMLSpanElement {
	constructor() { super(); this.lineHeight = 40; }
	/** @param {number} digit Digit value */
	set value(digit) { this.style.transform = `translateY(-${digit * this.lineHeight}px)`; }
}

class OdometerDisplay extends HTMLTimeElement {
	constructor() {
		super();
		/** @type {OdometerDigit[]} @readonly */
		this.tracks = [];
	}

	connectedCallback() {
		this.textContent = "";
		this.style.display = "flex";
		this.style.overflow = "hidden";
	}

	/**
	 * Rebuilds the tracks: one for every digit, the groups separated by a colon.
	 * @param {number[]} groups Number of digits in each group
	 */
	buildTracks(groups) {
		this.textContent = "";
		this.tracks.length = 0;

		const height = this.clientHeight;
		groups.forEach((digits, group) => {
			for (let i = 0; i < digits; i++) {
				const track = document.createElement("span", { is: "odometer-track" });
				track.textContent = "0\n1\n2\n3\n4\n5\n6\n7\n8\n9";
				if (track instanceof OdometerDigit) {
					if (height > 0) track.lineHeight = height;
					this.tracks.push(track);
				}
				this.appendChild(track);
			}
			if (group < groups.length - 1) this.append(":");
		});
	}

	/** @param {number} digits Number of digits */
	init(digits) { this.buildTracks([digits]); }

	/** @type {DigitGetter} */
	getDigit = (value, pos) => Math.floor(value / Math.pow(10, pos)) % 10;

	/** @param {number} value */
	set value(value) { this.tracks.forEach((track, i) => track.value = this.getDigit(value, this.tracks.length - 1 - i)); }
}

class OdometerTime extends OdometerDisplay {

	static get observedAttributes() { return ["datetime", "value"]; }

	connectedCallback() {
		if (!this.hasAttribute("value") && !this.hasAttribute("datetime") && this.textContent.trim())
			this.setAttribute("value", this.textContent.trim());
		this.buildTracks(this.groupSizes());
		this.update();
		this.style.overflow = "hidden";
	}

	/** Whether the digits come from the value attribute instead of the date. */
	usingValue() { return this.hasAttribute("value"); }

	/** The digits of each group: the groups of the value, or the hours, minutes and seconds. */
	groups() {
		if (!this.usingValue()) {
			const date = new Date(this.dateTime);
			return [date.getHours(), date.getMinutes(), date.getSeconds()].map(part => String(part || 0).padStart(2, "0"));
		}
		const parts = (this.getAttribute("value") || "00:00:00").split(":");
		return parts.map((part, i) => String(parseInt(part, 10) || 0).padStart(i === 0 && parts.length === 4 ? 3 : 2, "0"));
	}

	/** The number of digits in each group. */
	groupSizes() { return this.groups().map(group => group.length); }

	/**
	 * @param {string} name Name of the attribute
	 * @param {string} oldValue Old value
	 * @param {string} newValue New value
	 */
	attributeChangedCallback(name, oldValue, newValue) {
		if (oldValue === newValue) return;
		if (name === "value") return this.update();
		if (name !== "datetime" || this.usingValue()) return;
		if (this.tracks.length !== 6) this.buildTracks([2, 2, 2]);
		this.update();
	}

	update() {
		const digits = this.groups().join("").split("").map(Number);
		this.tracks.forEach((track, i) => { if (digits[i] !== undefined) track.value = digits[i]; });
	}
}

/** @type {CustomElementMap} */
let customElems;
/** @constant */
const customs = customElems = {
	"window-div": { constructor: WindowElement, extends: "div" },
	"odometer-track": { constructor: OdometerDigit, extends: "span" },
	"odometer-display": { constructor: OdometerDisplay, extends: "time" },
	"odometer-time": { constructor: OdometerTime, extends: "time" }
};

Object.entries(customElems).forEach(([name, c]) => customElements.define(name, c.constructor, c));

class Modern {
	/**
	 * Moves an element into a picture-in-picture window, and back when it closes.
	 * @param {HTMLElement} el The element to move
	 * @param {(pipWindow: Window)=>void} callback Called when the window is open
	 * @param {string|string[]} [stylesheets] The stylesheets the window should use
	 */
	static toggleElementPip(el, callback, stylesheets) {
		const pip = window.documentPictureInPicture;
		if (!pip) return console.warn("Document Picture-in-Picture not supported in this browser.");
		pip.window?.close();

		const rect = el.getBoundingClientRect();
		pip.requestWindow({ width: Math.round(rect.width) || 400, height: Math.round(rect.height) || 300 }).then(pipWindow => {
			const parent = el.parentNode, sibling = el.nextSibling;
			const sheets = ["./Styles/pip.css"];
			if (stylesheets) sheets.push(...(Array.isArray(stylesheets) ? stylesheets : [stylesheets]));

			Modern.loadStylesheets(pipWindow, sheets).then(() => pipWindow.dispatchEvent(new Event("resize")));
			pipWindow.document.body.appendChild(el);
			pipWindow.addEventListener("pagehide", () => parent && (sibling ? parent.insertBefore(el, sibling) : parent.appendChild(el)), { once: true });
			callback(pipWindow);
		});
	}

	/**
	 * Loads stylesheets into a picture-in-picture window. The window is a document
	 * of its own, so it needs the styles it should have.
	 * @param {Window} pipWindow The window to load the stylesheets into
	 * @param {string[]} stylesheets The stylesheets to load
	 */
	static loadStylesheets(pipWindow, stylesheets) {
		const head = pipWindow.document.head || pipWindow.document.documentElement;
		return Promise.all(stylesheets.map(stylesheet => new Promise(resolve => {
			const link = pipWindow.document.createElement("link");
			link.rel = "stylesheet";
			link.href = new URL(stylesheet, document.baseURI).href;
			link.addEventListener("load", resolve, { once: true });
			link.addEventListener("error", resolve, { once: true });
			head.appendChild(link);
		})));
	}
}
