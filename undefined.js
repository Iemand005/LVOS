

function Test() {
  this._x = 0;
  this.y = 0;
}

Object.defineProperty(Test.prototype, "x", {
    get: function() { return this._x; },
    set: function(x) { return this._x = x; }
}); 

Test.prototype.read = function() {
  /** @type {number} */
  var a = this.x;
  /** @type {number} */
  var b = this.y;
}

Test.prototype.write = function() {
    this.y = 10;
}