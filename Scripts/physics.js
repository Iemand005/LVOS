// Basic physics implementation
// Lasse Lauwerys © 2023
// 30/12/2023

function Vector(x, y){
    this.x = x || 0;
    this.y = y || 0;
}

Vector.prototype = {
    add: function(vector){ return this.x += (vector.x || vector), this.y += (vector.y || vector), this; },
    sub: function(vector){ return this.x -= (vector.x || vector), this.y -= (vector.y || vector), this; },
    mul: function(vector){ return this.x *= (vector.x || vector), this.y *= (vector.y || vector), this; },
    div: function(vector){ return this.x /= (vector.x || vector), this.y /= (vector.y || vector), this; },
    clone: function(){ return new Vector(this.x, this.y); }
}