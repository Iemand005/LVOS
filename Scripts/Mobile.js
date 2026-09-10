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

	const blurGradient = this.document.createElement("div");

	const layers = 10;
	const blur = 0.5;

	for (let i = 0; i < layers; i++) {
		const element = document.createElement('div');
		const start = 0;
		const end = Math.pow((layers - i) / layers, 0.5) * 100;

		element.style.setProperty('--blur', `${blur * i}px`);
		element.style.setProperty('--start', `${start}%`);
		element.style.setProperty('--end', `${end}%`);

		blurGradient.appendChild(element);
	}
});
