class OdometerTrack extends HTMLSpanElement {
	connectedCallback() {}

	setDigit(digit) {
		// 40px height per character row
		const shiftY = digit * 40; 
		this.style.transform = `translateY(-${shiftY}px)`;
	}
}

customElements.define("odometer-track", OdometerTrack, {
	extends: "span"
});

class OdometerTime extends HTMLTimeElement {

	static get observedAttributes() {
        return ["datetime"];
    }

	constructor() {
		super();
		/** @type {OdometerTrack[]} */
		this.tracks = [];

		this.odometerActive = true;
	}

	connectedCallback() {
		this.textContent = "";

		for (let i = 0; i < 6; i++) {
			this.addDigit();

			if (i === 1 || i === 3) {
				this.append(":");
			}
		}

		this.update();
	}

	addDigit() {
		const track = document.createElement("span", {
			is: "odometer-track"
		});
		track.textContent = "0\n1\n2\n3\n4\n5\n6\n7\n8\n9";
		this.tracks.push(track);
		this.appendChild(track);
	}

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

customElements.define("odometer-time", OdometerTime, {
	extends: "time"
});