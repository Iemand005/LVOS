window.addEventListener("load", function(e){
	const homeButton = document.getElementById("home-button");
	const backButton = document.getElementById("back-button");
	const appsButton = document.getElementById("apps-button");

	var mainFrame = document.getElementById("main-frame");
	
	if (homeButton) homeButton.onclick = function() {
		if (!(mainFrame instanceof HTMLIFrameElement)) return;
		mainFrame.classList.remove("open");
	};

	if (backButton) backButton.onclick = function() {
		if (!(mainFrame instanceof HTMLIFrameElement) || !mainFrame.contentWindow) return;
		mainFrame.contentWindow.history.back();
	};

	if (launchpad) launchpad.isMobile = true;
});

