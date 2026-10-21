
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
	connectedCallback() { this.setAttribute("is", "odometer-track"); }
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
		this.setAttribute("is", "odometer-display");
		this.textContent = "";
		this.style.display = "flex";
		this.style.overflow = "hidden";
	}

	/** Takes the tracks and the colons between them away. */
	clearTracks() {
		this.textContent = "";
		this.tracks.length = 0;
	}

	/** @param {number} count Number of digit tracks */
	addTracks(count) {
		const height = this.clientHeight;
		for (let i = 0; i < count; i++) {
			const track = this.addDigit();
			if (height > 0) track.lineHeight = height;
		}
	}

	addDigit() {
		const track = document.createElement("span", { is: "odometer-track" });
		track.textContent = "0\n1\n2\n3\n4\n5\n6\n7\n8\n9";
		if (track instanceof OdometerDigit) this.tracks.push(track);
		this.appendChild(track);
		return /** @type {OdometerDigit} */(track);
	}

	/** @param {number} digits Number of digits */
	init(digits) {
		this.clearTracks();
		this.addTracks(digits);
	}

	/** @type {DigitGetter} */
	getDigit = (value, pos) => Math.floor(value / Math.pow(10, pos)) % 10;

	/** @param {number} value */
	set value(value) { this.tracks.forEach((track, i) => track.value = this.getDigit(value, this.tracks.length - 1 - i)); }
}

class OdometerTime extends OdometerDisplay {

	static get observedAttributes() { return ["datetime", "value"]; }

	connectedCallback() {
		this.setAttribute("is", "odometer-time");

		if (!this.hasAttribute("value") && !this.hasAttribute("datetime") && this.textContent.trim())
			this.setAttribute("value", this.textContent.trim());

		this.buildTracks(this.currentGroupCount());
		this.update();

		this.style.overflow = "hidden";
	}

	/** Whether the digits come from the value attribute instead of the date. */
	usingValue() { return this.hasAttribute("value"); }

	/** The number of groups of digits: the groups of the value, or HH:MM:SS. */
	currentGroupCount() { return this.usingValue() && this.getAttribute("value")?.split(":").length || 3; }

	/** @param {number} groups Number of groups of digits */
	buildTracks(groups) {
		this.clearTracks();

		for (let i = 0; i < groups; i++) {
			this.addTracks(i === 0 && groups === 4 ? 3 : 2); // the days group gets 3 digits
			if (i < groups - 1) this.append(":");
		}
	}

	/**
	 * @param {string} name Name of the attribute
	 * @param {string} oldValue Old value
	 * @param {string} newValue New value
	 */
	attributeChangedCallback(name, oldValue, newValue) {
		if (oldValue === newValue) return;
		if (name === "value") this.update();
		else if (name === "datetime" && !this.usingValue()) {
			if (this.tracks.length !== 6) this.buildTracks(3); // HH:MM:SS → 6 digit tracks
			this.update();
		}
	}

	update() {
		const date = new Date(this.dateTime);
		const time = [date.getHours(), date.getMinutes(), date.getSeconds()]
			.map(part => String(part || 0).padStart(2, "0")).join(":");

		const value = this.usingValue() ? (this.getAttribute("value") || "00:00:00") : time;
		const parts = value.split(":").map(part => parseInt(part, 10) || 0);

		const digits = parts.flatMap((part, i) =>
			[...String(part).padStart(i === 0 && parts.length === 4 ? 3 : 2, "0")].map(ch => parseInt(ch, 10))
		);

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
	/** @param {HTMLElement} el @param {(pipWindow: Window)=>void} callback */
	static toggleElementPip(el, callback) {
		const pip = window.documentPictureInPicture;
		if (!pip) return console.warn("Document Picture-in-Picture not supported in this browser.");

		pip.window?.close();

		const rect = el.getBoundingClientRect();

		pip.requestWindow({
			width: Math.round(rect.width) || 400,
			height: Math.round(rect.height) || 300
		}).then(pipWindow => {
			const parent = el.parentNode, sibling = el.nextSibling;

			pipWindow.document.body.style.margin = "0";
			pipWindow.document.body.appendChild(el);

			pipWindow.addEventListener("pagehide", () => {
				if (!parent) return;
				sibling ? parent.insertBefore(el, sibling) : parent.appendChild(el);
			}, { once: true });

			callback(pipWindow);
		});
	}
}
