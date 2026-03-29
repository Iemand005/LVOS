

function Test() {
  this._x = 0;
}

Object.defineProperty(Dialog.prototype, "x", {
    get: function() { return this._x; },
    /** @param {number} x */
    set: function(x) { if (typeof x == "number") this.move(x, this._y); }
}); 

Test.prototype.getWindowState = function() {
  /** @type {number} */
  var a = this.x;
  /** @type {number} */
  var v = this.y;
}

/** @param {DialogState} state */
Test.prototype.loadWindowState = function(state) {
    // this.x = state.x;
    this.y = state.y;
}