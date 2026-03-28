
function Meow() {
  this._test = 10;
}

Object.defineProperty(Meow.prototype, "test", {
  get: function() {
    return this._test;
  },
  set: function(value) {
    this._test = value;
  }
});

Meow.prototype.doThings = function() {
  this.test = 10;
};