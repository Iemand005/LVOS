window.addEventListener("load", function(e){
	var homeButton = document.getElementById("home-button");
	var backButton = document.getElementById("back-button");

	var goBack = function() {
		mobileFrameManager.goBack();
	};
	
	if (homeButton) homeButton.onclick = function() {
		mobileFrameManager.hide();
	};

	if (backButton) backButton.onclick = goBack;

	if (launchpad) launchpad.isMobile = true;
	
	window.history.pushState(null, "", window.location.href);
	
	window.addEventListener('popstate', function (event) {
		
		window.history.pushState(null, "", window.location.href);
		
		console.log("I gotta handle backnav!");

		goBack();
	});

	const blurGradient = document.createElement("div");
	blurGradient.className = "blur-gradient";
	blurGradient.classList.add("horizontal");

	const layers = 30;
	const blur = 0.2;
	const reverse = true;
	/** @type {HTMLDivElement[]} */
	const blurLayers = [];

	for (let i = 0; i < layers; i++) {
		const element = document.createElement("div");

		const progress = Math.pow((layers - i) / layers, 0.5);
		const start = reverse ? 100 - progress * 100 : 0;
		const end = reverse ? 100 : progress * 100;

		element.style.setProperty("--blur", `${blur * i}px`);
		element.style.setProperty("--start", `${start}%`);
		element.style.setProperty("--end", `${end}%`);

		blurGradient.appendChild(element);
		blurLayers.push(element);
	}

	this.document.body.appendChild(blurGradient);

	const springBoard = document.querySelector(".spring-board");
	const rotation = document.querySelector("#rotation");
	if (!(springBoard instanceof HTMLElement)) return;

	/**
	 * @param {number} value
	 * @param {number} max
	 */
	var setProgress = function(value, max) {
		const degrees = value;
		const scale = 1 + degrees / 150;
		const blurScale = degrees / 30;

		blurLayers.forEach((element, i) => {
			element.style.setProperty("--blur", `${blur * i * blurScale}px`);
		});

		springBoard.style.transform = `perspective(5000px) rotateY(${degrees}deg) scaleX(${scale})`;

		const maskProgress = 1 - degrees / (max / 1.7);
		const opacity = Math.min(1, (maskProgress + 0.5) * 3);

		springBoard.style.setProperty("--mask",`linear-gradient(to right, rgb(0 0 0 / ${opacity}), rgb(0 0 0 / ${maskProgress}))`);
	};

	if (!(rotation instanceof HTMLInputElement)) return;
	rotation.addEventListener("input", function () {
		setProgress(Number(rotation.value), Number(rotation.max));
	});

	setProgress(0, Number(rotation.max));
});
