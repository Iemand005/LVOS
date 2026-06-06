// Basic physics implementation
// Lasse Lauwerys © 2023
// 30/12/2023

/**
 * @param {number} [x]
 * @param {number} [y]
 */
function Vector(x, y){
    if (typeof x === "undefined") x = 0, y = 0;
    else if (typeof y === "undefined") y = x;
    this.x = x;
    this.y = y;
}

Vector.prototype = {
    /** @param {Vector} vector */
    add: function (vector) { return this.x += vector.x, this.y += vector.y, this; },
    /** @param {Vector} vector */
    sub: function (vector) { return this.x -= vector.x, this.y -= vector.y, this; },
    /** @param {Vector} vector */
    mul: function (vector) { return this.x *= vector.x, this.y *= vector.y, this; },
    /** @param {Vector} vector */
    div: function (vector) { return this.x /= vector.x, this.y /= vector.y, this; },
    /** @param {Vector} vector */
    sum: function (vector) { return new Vector(this.x + vector.x, this.y + vector.y); },
    /** @param {Vector} vector */
    difference: function (vector) { return new Vector(this.x - vector.x, this.y - vector.y); },
    /** @param {Vector} vector */
    product: function (vector) { return new Vector(this.x * vector.x, this.y * vector.y); },
    /** @param {Vector} vector */
    quotient: function (vector) { return new Vector(this.x / vector.x, this.y / vector.y); },
    /** @param {Vector} vector */
    set: function (vector) { return this.x = vector.x, this.y = vector.y, this; },
    clone: function () { return new Vector(this.x, this.y); }
};

/**
 * 
 * @param {number | {x:number,y:number,z:number}} x 
 * @param {number} y 
 * @param {number} z 
 */
function Vector3D(x, y, z) {
    this.x = 0;
    this.y = 0;
    this.z = 0;
    if (typeof x === "number") {
        this.x = x;
        if (y == null && z == null) 
            this.y = x, this.z = x;
        else this.y = y, this.z = z;
    } else if (typeof x === "object" && x.x && x.y && x.z) {
        this.x = x.x, this.y = x.y, this.z = x.z;
    }
}

/** @param {number} amount */
Vector3D.prototype.div = function (amount) {
    this.x /= amount, this.y /= amount, this.z /= amount;
    return this;
}

Vector3D.prototype.normalize = function () {
    return this.div(this.x + this.y + this.z);
}
