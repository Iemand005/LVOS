
function Vector(x, y){
    this.x = x || 0;
    this.y = y || 0;
}
Vector.prototype.add = function(vector){ return this.x += vector.x, this.y += vector.y, this; };
Vector.prototype.sub = function(vector){ return this.x -= vector.x, this.y -= vector.y, this; };
Vector.prototype.mul = function(vector){ return this.x *= vector.x, this.y *= vector.y, this; };
Vector.prototype.div = function(vector){ return this.x /= vector.x, this.y /= vector.y, this; };
Vector.prototype.clone = function(){ return new Vector(this.x, this.y); };
