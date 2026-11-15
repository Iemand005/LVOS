function swapMetroBody() {
	if (!windowManager.flipped) return;
	windowManager.activeDialogToMetro();
}

/** @param {boolean} enable */
function flip(enable){
	var desktop = document.getElementById("desktop");;
	if (!desktop) return;
	desktop.toggleAttribute("flipped", enable); // Deprecated; moving to a class attribute.
	flipHandler(desktop.classList.toggle("flipped", enable));
}

/** @param {boolean} enable */
function flipHandler(enable){
	DesktopManager.toggleCharms(false);
	swapMetroBody();
	windowManager.flipped = enable;
	return windowManager.flipped;
}