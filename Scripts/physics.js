// Basic physics implementation
// Lasse Lauwerys © 2023
// 30/12/2023

function Vector(x, y){
    this.x = x || 0;
    this.y = y || 0;
}

Vector.prototype = {
    add: function (vector) { return this.x += vector.x, this.y += vector.y, this; },
    sub: function (vector) { return this.x -= vector.x, this.y -= vector.y, this; },
    mul: function (vector) { return this.x *= vector.x, this.y *= vector.y, this; },
    div: function (vector) { return this.x /= vector.x, this.y /= vector.y, this; },
    sum: function (vector) { return new Vector(this.x + vector.x, this.y + vector.y); },
    difference: function (vector) { return new Vector(this.x - vector.x, this.y - vector.y); },
    product: function (vector) { return new Vector(this.x * vector.x, this.y * vector.y); },
    quotient: function (vector) { return new Vector(this.x / vector.x, this.y / vector.y); },
    set: function (vector) { return this.x = vector.x, this.y = vector.y, this; },
    clone: function () { return new Vector(this.x, this.y); }
};

function Vector3D(x, y, z) {
    this.x = 0;
    this.y = 0;
    this.z = 0;
    if (typeof x === "number") {
        this.x = x;
        if (y == null && z == null) {
            this.y = x;
            this.z = x;
        } else {
            this.y = y;
            this.z = z;
        }
    }
}

Vector3D.prototype.normalize = function () {
    var thing = this.x + this.y + this.z;
    this.x /= thing;
    this.y /= thing;
    this.z /= thing;
}

function Rectangle(x, y, width, height) {
    this.pos = this.position = new Vector(x, y);
    this.width = width;
    this.height = height;
}

Rectangle.prototype = {
    contains: function (vector) {
        return vector.x >= this.position.x && vector.y >= this.position.y && vector.x < this.position.x + this.width && vector.y < this.position.y + this.height;
    },
    get x() { return this.position.x; },
    get y() { return this.position.y; },
    set x(value) { this.position.x = value; },
    set y(value) { this.position.y = value; }
};