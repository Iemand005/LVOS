interface Meow {
  readonly rawr: number;
  test: number;
}

/**
 * @this Meow
 * @param this 
 */
function Meow(this: Meow) {
  // /** @type {number} */
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

Object.defineProperties(Meow.prototype, {
  rawr: {
    get: function() {
      return 10;
    }
  }
});

var mewo = new Meow();
mewo.rawr