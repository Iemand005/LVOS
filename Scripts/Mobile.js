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

	const blurGradient = document.querySelector('.blur-gradient');

/*
const layers = 100;
const maxBlur = 10;
const exponent = 2;

for (let i = layers; i > 0; i--) {
	const element = document.createElement('div');
	const t = (i - 1) / (layers - 1);

	element.style.setProperty('--blur', `${maxBlur * t ** exponent}px`);
	element.style.setProperty('--start', `${(layers - i) / layers * 100}%`);
	element.style.setProperty('--end', `${(layers - i + 1) / layers * 100}%`);

	blurGradient.appendChild(element);
}
	*/

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
