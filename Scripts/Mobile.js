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

	const layers = 10;
	const blur = 0.5;
	const reverse = false;

	for (let i = 0; i < layers; i++) {
		const element = document.createElement("div");

		const progress = Math.pow((layers - i) / layers, 0.5);
		const start = reverse ? (1 - progress) * 100 : 0;
		const end = reverse ? 100 : progress * 100;
		const blurAmount = blur * (reverse ? layers - 1 - i : i);

		element.style.setProperty("--blur", `${blurAmount}px`);
		element.style.setProperty("--start", `${start}%`);
		element.style.setProperty("--end", `${end}%`);

		blurGradient.appendChild(element);
	}
});
