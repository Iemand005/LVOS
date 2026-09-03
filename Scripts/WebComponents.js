
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
	constructor()  { super(); this.lineHeight = 40; }
	connectedCallback() { this.setAttribute("is", "odometer-track"); }
	/** @param {number} digit Digit value */
	set value(digit) { this.style.transform = `translateY(-${digit * this.lineHeight}px)`; }
}

class OdometerTime extends HTMLTimeElement {

	static get observedAttributes() { return ["datetime"]; }

	constructor() {
		super();
		/** @type {OdometerDigit[]} @readonly */
		this.tracks = [];
	}

	connectedCallback() {
		this.setAttribute("is", "odometer-time");

		this.textContent = "";

		for (let i = 0; i < 6; i++) {
			this.addDigit();

			if (i === 1 || i === 3)
				this.append(":");
		}


		this.update();
	}

	addDigit() {
		const track = /** @type {OdometerDigit} */ (document.createElement("span", { is: "odometer-track" }));
		track.textContent = "0\n1\n2\n3\n4\n5\n6\n7\n8\n9";
		this.tracks.push(track);
		this.appendChild(track);
	}
	/**
	 * @param {string} name Name of the attribute
	 * @param {string} oldValue Old value
	 * @param {string} newValue New value
	 */
	attributeChangedCallback(name, oldValue, newValue) {
        if (name === "datetime" && oldValue !== newValue) this.update();
    }

	update() {
		const date = new Date(this.dateTime);

		const hours = date.getHours();
		const minutes = date.getMinutes();
		const seconds = date.getSeconds();

		const digits = [
			Math.floor(hours / 10),
			hours % 10,
			Math.floor(minutes / 10),
			minutes % 10,
			Math.floor(seconds / 10),
			seconds % 10
		];

		this.tracks.forEach((track, i) => track.value = digits[i]);
	}
}

customElements.define("window-div", WindowElement, {
	extends: "div"
});

customElements.define("odometer-track", OdometerDigit, {
	extends: "span"
});

customElements.define("odometer-time", OdometerTime, {
	extends: "time"
});


class Modern {

	/**
	 * @param {HTMLElement} el - the element to pop out
	 * @param {(pipWindow:Window)=>void} callback - the element to pop out
	 */
	static toggleElementPip(el, callback) {
	if (typeof window.documentPictureInPicture === "undefined") {
		console.warn("Document Picture-in-Picture not supported in this browser.");
		return;
	}

	// If already in PiP, close it (this triggers pagehide -> restores element)
	var existing = window.documentPictureInPicture.window;
	if (existing) {
		existing.close();
		return;
	}

		var rect = el.getBoundingClientRect();
		var width = Math.round(rect.width) || 400;
		var height = Math.round(rect.height) || 300;

		window.documentPictureInPicture.requestWindow({ width:zwidth, height }).then(function(pipWindow) {
			var originalParent = el.parentNode;
			var originalNextSibling = el.nextSibling;

			pipWindow.document.body.style.margin = "0";
			pipWindow.document.body.appendChild(el);

			pipWindow.addEventListener("pagehide", function () {
				if (!originalParent) return;
				if (originalNextSibling) originalParent.insertBefore(el, originalNextSibling);
				else originalParent.appendChild(el);
			}, { once: true });

			callback(pipWindow);
		});
	};

}