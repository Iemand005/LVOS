window.addEventListener("DOMContentLoad", function(e){
	const homeButton = document.getElementById("home-button");

	if (homeButton) homeButton.onclick = function() {
		var mainFrame = document.getElementById("main-frame");
		if (!(mainFrame instanceof HTMLIFrameElement)) return;
		mainFrame.classList.remove("open");
	};
});