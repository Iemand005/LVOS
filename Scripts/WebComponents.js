
class DesktopElement extends HTMLElement {

}

class WindowElement extends HTMLDivElement {

	constructor() {
		super();
		/** @type {Dialog?} */
		this.dialog = null;
	}

	connectedCallback() {
		console.log("I connected balls");
	}
	/** @param {boolean} [enable] Enable maximization */
	toggleMaximizedVT(enable) {

		if (document.activeViewTransition)
			document.activeViewTransition.skipTransition();

		this.style.viewTransitionName = "window-fullscreen";

		const self = this;

		if (document.startViewTransition) {
			var transition = document.startViewTransition(() => self.classList.toggle("maximized", enable));

			transition.ready.catch(ev => console.warn("transition interrupted:", ev));

			const dialog = this.dialog;
			if (dialog) transition.finished.finally(() => {
				if (dialog.maximizeAnimations <= 1)
					self.style.viewTransitionName = "";
				dialog.maximizeAnimations--;
			});
		} else this.classList.toggle("maximized", enable);
	}
}

class OdometerDigit extends HTMLSpanElement {
	constructor()  { super(); this.lineHeight = 40, this._value = 0; }
	connectedCallback() { this.setAttribute("is", "odometer-track"); }
	/** @param {number} digit Digit value */
	set value(digit) { this.style.transform = `translateY(-${digit * this.lineHeight}px)`; }
	get value() { return this._value;}
}

class OdometerDisplay extends HTMLTimeElement {
	constructor() {
		super();
		/** @type {OdometerDigit[]} @readonly */
		this.tracks = [];
	}

	connectedCallback() {
		this.setAttribute("is", "odometer-time");

		this.textContent = "";

		this.style.display = "flex";
		this.style.overflow = "hidden";
	}

	/** @param {number} digits */
	init(digits) {
		this.innerHTML = "";
		this.tracks.length = 0;
		const height = this.clientHeight;
		for (let i = 0; i < digits; i++) {
			const digit = this.addDigit();
			if (digit) digit.lineHeight = height;
		}
	}

	addDigit() {
		const track = document.createElement("span", { is: "odometer-track" });
		if (!(track instanceof OdometerDigit)) return;
		track.textContent = "0\n1\n2\n3\n4\n5\n6\n7\n8\n9";
		this.tracks.push(track);
		this.appendChild(track);
		return track;
	}
	/**
	 * @param {number} value
	 * @param {number} pos
	 */
	getDigit(value, pos) {
		return Math.floor(value / Math.pow(10, pos)) % 10;
	}
	/** @param {number} value */
	set value(value) {
		this.tracks.forEach((track, i) => {
			track.value = this.getDigit(value, this.tracks.length - 1 - i);
		});
	}
}

class OdometerTime extends OdometerDisplay {

	static get observedAttributes() { return ["datetime", "value"]; }

	connectedCallback() {
		this.setAttribute("is", "odometer-time");

		if (!this.hasAttribute("value") && !this.hasAttribute("datetime") && this.textContent.trim()) {
			this.setAttribute("value", this.textContent.trim());
		}

		this.buildTracks(this.currentGroupCount());
		this.update();

		this.style.display = "flex";
		this.style.overflow = "hidden";
		this.style.justifyContent = "center";
	}

	/** value wins if present; otherwise fall back to datetime */
	usingValue() {
		return this.hasAttribute("value");
	}

	currentGroupCount() {
		if (this.usingValue()) {
			const v = this.getAttribute("value") || "00:00:00:00";
			return v.split(":").length;
		}
		return 4; // datetime mode always renders DD:HH:MM:SS
	}

	buildTracks(groups) {
		this.textContent = "";
		this.tracks.length = 0;

		for (let i = 0; i < groups; i++) {
			const digitsInGroup = (i === 0 && groups === 4) ? 3 : 2; // days group gets 3 digits
			for (let j = 0; j < digitsInGroup; j++) this.addDigit();
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

		if (name === "value") {
			const groups = newValue ? newValue.split(":").length : this.tracks.length;
			if (groups !== this.tracks.length) this.buildTracks(groups);
			this.update();
			return;
		}

		if (name === "datetime" && !this.usingValue()) {
			if (this.tracks.length !== 4) this.buildTracks(4);
			this.update();
		}
	}

	update() {
		let digits;

		if (this.usingValue()) {
			const value = this.getAttribute("value") || "00:00:00:00";
			const parts = value.split(":").map(n => parseInt(n, 10) || 0);
			digits = [];
			parts.forEach((part, i) => {
				const width = (i === 0 && parts.length === 4) ? 3 : 2;
				const str = String(part).padStart(width, "0");
				for (const ch of str) digits.push(parseInt(ch, 10));
			});
		} else {
			const target = new Date(this.getAttribute("datetime"));
			const diff = Math.max(0, target.getTime() - Date.now());
			const totalSeconds = Math.floor(diff / 1000);

			const days = Math.floor(totalSeconds / 86400);
			const hours = Math.floor((totalSeconds % 86400) / 3600);
			const minutes = Math.floor((totalSeconds % 3600) / 60);
			const seconds = totalSeconds % 60;

			digits = [
				...String(days).padStart(3, "0").split("").map(Number),
				Math.floor(hours / 10), hours % 10,
				Math.floor(minutes / 10), minutes % 10,
				Math.floor(seconds / 10), seconds % 10
			];
		}

		this.tracks.forEach((track, i) => {
			if (digits[i] !== undefined) track.value = digits[i];
		});
	}
}

customElements.define("window-div", WindowElement, {
	extends: "div"
});

customElements.define("odometer-track", OdometerDigit, {
	extends: "span"
});

customElements.define("odometer-display", OdometerDisplay, {
	extends: "time"
});

customElements.define("odometer-time", OdometerTime, {
	extends: "time"
});


class Modern {

	/**
	 * @param {HTMLElement} el
	 * @param {(pipWindow:Window)=>void} callback
	 */
	static toggleElementPip(el, callback) {
		if (typeof window.documentPictureInPicture === "undefined") {
			console.warn("Document Picture-in-Picture not supported in this browser.");
			return;
		}

		var existing = window.documentPictureInPicture.window;
		if (existing)
			existing.close();

		var rect = el.getBoundingClientRect();
		var width = Math.round(rect.width) || 400;
		var height = Math.round(rect.height) || 300;

		window.documentPictureInPicture.requestWindow({ width, height }).then(pipWindow => {
			var originalParent = el.parentNode;
			var originalNextSibling = el.nextSibling;

			pipWindow.document.body.style.margin = "0";
			pipWindow.document.body.appendChild(el);

			pipWindow.addEventListener("pagehide", () => {
				if (!originalParent) return;
				if (originalNextSibling) originalParent.insertBefore(el, originalNextSibling);
				else originalParent.appendChild(el);
			}, { once: true });

			callback(pipWindow);
		});
	};

}