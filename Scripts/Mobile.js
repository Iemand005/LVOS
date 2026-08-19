window.addEventListener("load", function(e){
	const homeButton = document.getElementById("home-button");
	const backButton = document.getElementById("back-button");
	const appsButton = document.getElementById("apps-button");

	var mainFrame = document.getElementById("main-frame");

	var goBack = function() {
		if (!(mainFrame instanceof HTMLIFrameElement) || !mainFrame.contentWindow) return;
		mainFrame.contentWindow.history.back();
	};
	
	if (homeButton) homeButton.onclick = function() {
		if (!(mainFrame instanceof HTMLIFrameElement)) return;
		mainFrame.classList.remove("open");
	};

	if (backButton) backButton.onclick = function() {
	};

	if (launchpad) launchpad.isMobile = true;
	
	window.history.pushState(null, "", window.location.href);
	
	window.addEventListener('popstate', function (event) {
		
		window.history.pushState(null, "", window.location.href);
		
		console.log("I gotta handle backnav!");
	});
});


