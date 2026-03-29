

function Test() {
  this._x = 0;
  this._y = 0;
  this.z = 0;
}

Object.defineProperty(Test.prototype, "x", {
    get: function() { return this._x; },
    set: function(x) { return this._x = x; }
});

Object.defineProperty(Test.prototype, "y", {
    get: function() { return this._y; },
    set: function(y) { if (typeof y === "number") return this._y = y; }
});

Test.prototype.read = function() {
  /** @type {number} */
  var a = this.x;
  /** @type {number} */
  var b = this.y;
  /** @type {number} */
  var c = this.z;
}

Test.prototype.write = function() {
  this.y = 10;
  this.z = 10;
}