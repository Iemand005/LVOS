
/**
 * @param {{onSelect: (el: Element)=>void}} options
 */
function ElementPicker(options) {
	options = options || {};
	this.active = false;
	this.onSelect = options.onSelect || function (el, selector) {
		console.log('Selected:', el, selector);
	};
	this.box = null;
	this.statusEl = null;
 
	this.onMove = this.onMove.bind(this);
	this.onClick = this.onClick.bind(this);
	this.onKey = this.onKey.bind(this);
}
 
ElementPicker.prototype.register = function () {
	var self = this;
	document.addEventListener('keydown', function (e) {
		if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') {
			e.preventDefault();
			self.active ? self.stop() : self.start();
		}
	});
};
 
ElementPicker.prototype.start = function () {
	this.active = true;
	this.createBox();
	document.body.style.cursor = 'crosshair';
	document.addEventListener('mousemove', this.onMove, true);
	document.addEventListener('click', this.onClick, true);
	document.addEventListener('keydown', this.onKey, true);
	this.status('Pick mode: click an element (Esc to cancel)');
};
 
ElementPicker.prototype.stop = function () {
	this.active = false;
	document.body.style.cursor = '';
	if (this.box) this.box.style.display = 'none';
	document.removeEventListener('mousemove', this.onMove, true);
	document.removeEventListener('click', this.onClick, true);
	document.removeEventListener('keydown', this.onKey, true);
	this.status('');
};

/**
 * 
 * @param {Event} e 
 * @returns 
 */
ElementPicker.prototype.onMove = function (e) {
	var el = e.target;
	if (!el || el === this.box || el === this.statusEl || !(el instanceof HTMLElement) || this.box === null) return;
	el.style.outline = '3px solid #2f81f7'

};

/** @param {HTMLElement} el */
ElementPicker.prototype.drawRectArond = function (el) {
	var r = el.getBoundingClientRect();
	var s = this.box.style;
	s.display = 'block';
	s.left = r.left + 'px';
	s.top = r.top + 'px';
	s.width = r.width + 'px';
	s.height = r.height + 'px';
};
 
ElementPicker.prototype.onClick = function (e) {
	e.preventDefault();   // don't trigger links/buttons while picking
	e.stopPropagation();
	var el = e.target;
	this.stop();
	this.onSelect(el);
};
 
ElementPicker.prototype.onKey = function (e) {
	if (e.key === 'Escape') this.stop();
};
 
ElementPicker.prototype.createBox = function () {
	if (this.box) return;
	this.box = document.createElement('div');
	Object.assign(this.box.style, {
		position: 'fixed',
		pointerEvents: 'none',
		zIndex: 2147483646,
		border: '2px solid #2f81f7',
		background: 'rgba(47,129,247,0.15)',
		display: 'none'
	});
	document.body.appendChild(this.box);
};
 
ElementPicker.prototype.status = function (msg) {
	if (!this.statusEl) {
		this.statusEl = document.createElement('div');
		Object.assign(this.statusEl.style, {
			position: 'fixed', bottom: '12px', right: '12px',
			background: '#222', color: '#fff', padding: '6px 12px',
			borderRadius: '6px', font: '13px system-ui, sans-serif',
			zIndex: 2147483647, display: 'none'
		});
		document.body.appendChild(this.statusEl);
	}
	this.statusEl.textContent = msg;
	this.statusEl.style.display = msg ? 'block' : 'none';
};
