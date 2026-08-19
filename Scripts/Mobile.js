window.addEventListener("load", function(e){
	const homeButton = document.getElementById("home-button");
	const backButton = document.getElementById("back-button");
	const appsButton = document.getElementById("apps-button");

	if (homeButton) homeButton.onclick = function() {
		var mainFrame = document.getElementById("main-frame");
		if (!(mainFrame instanceof HTMLIFrameElement)) return;
		mainFrame.classList.remove("open");
	};

	if (backButton) backButton.onclick = function() {
		
	};
});