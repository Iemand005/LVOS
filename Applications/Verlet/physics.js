
/**
 * @param {number} x 
 * @param {number} y 
 */
function Vector(x, y) {
    this.x = x || 0;
    this.y = y || 0;
}
Vector.prototype = {
    add: function(/** @type {Vector} */vector){
        return this.x += vector.x, this.y += vector.y, this;
    },
    sub: function(/** @type {Vector} */vector){
        return this.x -= vector.x, this.y -= vector.y, this;
    },
    mul: function(/** @type {Vector} */vector){
        return this.x *= vector.x, this.y *= vector.y, this;
    },
    div: function(/** @type {Vector} */vector){
        return this.x /= vector.x, this.y /= vector.y, this;
    },
    sum: function(/** @type {Vector} */vector){
        return new Vector(this.x + vector.x, this.y + vector.y);
    },
    difference: function(/** @type {Vector} */vector){
        return new Vector(this.x - vector.x, this.y - vector.y);
    },
    product: function(/** @type {Vector} */vector){
        return new Vector(this.x * vector.x, this.y * vector.y);
    },
    quotient: function(/** @type {Vector} */vector){
        return new Vector(this.x / vector.x, this.y / vector.y);
    },
    set: function(/** @type {Vector} */vector){
        return this.x = vector.x, this.y = vector.y, this;
    },
    clone: function () {
        return new Vector(this.x, this.y);
    }
}

/**
 * @param {number} x 
 * @param {number} y 
 * @param {number} width 
 * @param {number} height 
 */
function Rectangle(x, y, width, height){
    this.pos = this.position = new Vector(x, y);
    this.width = width;
    this.height = height;
}

Rectangle.prototype = {
    contains: function (/** @type {Vector} */vector) {
        return vector.x >= this.position.x && vector.y >= this.position.y && vector.x < this.position.x + this.width && vector.y < this.position.y + this.height;
    },
    /** @this {Rectangle} */
    get x() { return this.position.x; },
    get y() { return this.position.y; },
    set x(value) { return this.position.x = value; },
    set y(value) { return this.position.y = value; }
};