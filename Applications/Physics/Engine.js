



// The modern way to do this is with Object.assign()!
Element.prototype = {
    position: new Vector,
    velocity: new Vector,
    acceleration: new Vector,
    update: function(){
        this.position.add(this.velocity.add(this.acceleration));
    }
};

// This is an older alternative to making classes with properties and inheritance. I am using constructor functions instead for compatibility with ES5 browsers.
Ball.prototype = {
    __proto__: Element.prototype
}

function Ball(radius){
    this.position = new Vector,
    this.velocity = new Vector,
    this.acceleration = new Vector,
    this.radius = radius || 1;
}

function BallCollection(amount){
    this.balls = new Array(amount || 0).fill(new Ball);
}

BallCollection.prototype = {
    balls: new Array,
    updateAll: function(){
        balls.forEach(function(ball){
            ball.update();
        });
    }
}

//Ball.__proto__ = Element.prototype;
