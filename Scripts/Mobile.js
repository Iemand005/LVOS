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
	const rotationValue = document.querySelector("#rotation-value");

	rotation.addEventListener("input", () => {
		const degrees = Number(rotation.value);
		const scale = 1 + degrees / 150;
		const blurScale = degrees / 30;

		blurLayers.forEach((element, i) => {
			element.style.setProperty("--blur", `${blur * i * blurScale}px`);
		});

		springBoard.style.transform =
			`perspective(5000px) rotateY(${degrees}deg) scaleX(${scale})`;

		const maskProgress = degrees / Number(rotation.max);

		springBoard.style.setProperty(
			"--mask",
			`linear-gradient(to right, black 0%, black ${1 / maskProgress}%, transparent 100%)`
		);
	});
});
