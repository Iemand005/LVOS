
function ElementPicker() {
	this.active = false;
}

ElementPicker.prototype.register = function() {
	var self = this;
	document.addEventListener('keydown', (e) => {
		if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') {
			e.preventDefault();
			self.active ? stop() : start();
		}
	});
}

ElementPicker.prototype.start = function() {
	this.active = true;
	document.body.style.cursor = 'crosshair';
	// capture = true so we run before the page's own click handlers
	document.addEventListener('mousemove', onMove, true);
	document.addEventListener('click', onClick, true);
	document.addEventListener('keydown', onKey, true);
	status('Pick mode: click an element (Esc to cancel)');
}