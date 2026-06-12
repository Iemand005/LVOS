
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

