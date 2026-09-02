
class WindowDiv extends HTMLDivElement {
	connectedCallback() {
		console.log("I connected balls");
	}

	maximize() {

		if (document.activeViewTransition) {
			document.activeViewTransition.skipTransition();
		}


		this.target.style.viewTransitionName = "window-fullscreen";

		if (document.startViewTransition) {
			var transition = document.startViewTransition(function() {
				if (!self.target) return;
				self.target.classList.toggle("maximized", enable);
			});
			if (!self.target) return;


			transition.ready.catch(function(ev) {
				console.warn("transition interrupted:", ev);
			});

			transition.finished.finally(function() {
				if (!self.target) return;
				if (maximizeAnimations <= 1) {
					self.target.style.viewTransitionName = "";
				}
				maximizeAnimations--;
			});
		} else this.target.classList.toggle("maximized", enable);
	}
}

class OdometerTrack extends HTMLSpanElement {
	constructor()  {
		super();
		this.lineHeight = 40;
	}
	connectedCallback() {
		this.setAttribute("is", "odometer-track");
	}
	/** @param {number} digit Digit value */
	setDigit(digit) {
		const shiftY = digit * this.lineHeight;
		this.style.transform = `translateY(-${shiftY}px)`;
	}
}

class OdometerTime extends HTMLTimeElement {

	static get observedAttributes() {
        return ["datetime"];
    }

	constructor() {
		super();
		/** @type {OdometerTrack[]} */
		this.tracks = [];
	}

	connectedCallback() {
		this.textContent = "";

		for (let i = 0; i < 6; i++) {
			this.addDigit();

			if (i === 1 || i === 3) {
				this.append(":");
			}
		}

		this.setAttribute("is", "odometer-time");

		this.update();
	}

	addDigit() {
		const track = document.createElement("span", {
			is: "odometer-track"
		});
		track.textContent = "0\n1\n2\n3\n4\n5\n6\n7\n8\n9";
		if (track instanceof OdometerTrack) this.tracks.push(track);
		this.appendChild(track);
	}
	/**
	 * @param {string} name Name of the attribute
	 * @param {string} oldValue Old value
	 * @param {string} newValue New value
	 */
	attributeChangedCallback(name, oldValue, newValue) {
        if (name === "datetime" && oldValue !== newValue) {
            this.update();
        }
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

		this.tracks.forEach((track, index) => track.setDigit(digits[index]));
	}
}

customElements.define("window-div", WindowDiv, {
	extends: "div"
});

customElements.define("odometer-track", OdometerTrack, {
	extends: "span"
});

customElements.define("odometer-time", OdometerTime, {
	extends: "time"
});