
function ElementPicker() {

}

ElementPicker.prototype.register = function() {
	document.addEventListener('keydown', (e) => {
		if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') {
			e.preventDefault();
			active ? stop() : start();
		}
	});
}