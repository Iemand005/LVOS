
/**
 * @param {(el: Element, onSelect: ()=>void)=>void} options
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
 
ElementPicker.prototype.onMove = function (e) {
	var el = e.target;
	if (el === this.box || el === this.statusEl) return;
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
	this.onSelect(el, this.getSelector(el));
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
 
ElementPicker.prototype.getSelector = function (el) {
	if (el.id) return '#' + CSS.escape(el.id);
	var parts = [];
	while (el && el.nodeType === 1 && el !== document.body) {
		var part = el.tagName.toLowerCase();
		var parent = el.parentElement;
		if (parent) {
			var same = Array.prototype.filter.call(parent.children, function (c) {
				return c.tagName === el.tagName;
			});
			if (same.length > 1) part += ':nth-of-type(' + (same.indexOf(el) + 1) + ')';
		}
		parts.unshift(part);
		el = parent;
	}
	return parts.join(' > ');
};

var picker = new ElementPicker({
	onSelect: function (el, selector) {
		el.style.outline = '3px solid #2f81f7';
		console.log(selector);
	}
});
picker.register();