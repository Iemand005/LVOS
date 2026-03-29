

function Test() {
  this._x = 0;
}

Object.defineProperty(Test.prototype, "x", {
    get: function() { return this._x; }
}); 

Test.prototype.read = function() {
  /** @type {number} */
  var a = this.x;
  /** @type {number} */
  var v = this.y;
}

Test.prototype.write = function() {
    this.y = 10;
}